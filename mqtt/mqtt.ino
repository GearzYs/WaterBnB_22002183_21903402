#include <ArduinoOTA.h>
#include "ArduinoJson.h"
#include <WiFi.h>
#include "wifi_utils.h"
#include "OneWire.h"
#include "DallasTemperature.h"
#include <Adafruit_NeoPixel.h>
#include <PubSubClient.h>
#include "esp_sleep.h"
#include <Adafruit_NeoPixel.h>

#define USE_SERIAL Serial
#define LEDGREEN 19
#define LEDRED 21
#define LEDBLUE 2
#define PIN 12
#define NUMLEDS 5
#define LUMCAPTEUR A5
#define TOPIC "uca/iot/piscine"
#define TOPIC_WATERBNB "uca/waterbnb"
#define TOPIC_LED "uca/iot/led"
#define TOPIC_TEMPERATURE "uca/iot/temperature"  // j'ai ajoute ca car tu le mettais en dur dans le code
#define SEUIL_PRESENCE 200
#define TIME_TO_SLEEP 10 // en secondes
#define TIME_TO_UP 2 // en secondes
#define RAYON_RECHERCHE_KM 10.0 // Rayon de recherche des piscines à proximité en kilomètres

Adafruit_NeoPixel strip(NUMLEDS, PIN, NEO_GRB + NEO_KHZ800);
// Fonction pour convertir les degrés en rads
double rads(double degrees) {
    return degrees * M_PI / 180.0;
}

// Fonction haversine pour calculer la distance entre deux coordonnées GPS en kilomètres
double haversine(double lat1, double lon1, double lat2, double lon2) {
    const double R = 6371.0;  // Rayon moyen de la Terre en kilomètres

    double dLat = rads(lat2 - lat1);
    double dLon = rads(lon2 - lon1);

    double a = sin(dLat / 2) * sin(dLat / 2) +
               cos(rads(lat1)) * cos(rads(lat2)) * sin(dLon / 2) * sin(dLon / 2);
    double c = 2 * atan2(sqrt(a), sqrt(1 - a));

    double distance = R * c;
    return distance;
}

typedef struct {
    float temperature;
    float lat = 48.862725;
    float lon = 2.287592;
    int luminosity;
    bool hotspot = false;
    bool occuped = false;
    String owner = "P_22002183";
} esp_model;

/*====== MQTT configuration ==================*/
const char* mqtt_server = "test.mosquitto.org";
//const char* mqtt_server = "84.235.237.236";
//const char* mqtt_user = "espofuca";
//const char* mqtt_password = "vn3syxrrGQk91YKL44JOZGno";
WiFiClient espClient;
PubSubClient mqttclient(espClient);
String hostname = "Piscine Jean Bouin";
String payload;
float latestTemperatureFromBroker = 0.0;

//create models with that other pools
esp_model otherPool1;
esp_model otherPool2;
esp_model otherPool3;

/*===== ESP GPIO configuration ==============*/
OneWire oneWire(23); // Pour utiliser une entite oneWire sur le port 23
DallasTemperature tempSensor(&oneWire); // Cette entite est utilisee par le capteur
esp_model model;

//compare la température de notre piscine avec celles quelles voient sur mqtt 
bool isHotspot(float currentTemperature, String currentOwner, float otherPoolTemperature, String otherPoolOwner, float otherPoolLatitude, float otherPoolLongitude) {
    Serial.println("isHotspot");
    double distance = haversine(model.lat, model.lon, otherPoolLatitude, otherPoolLongitude);
    if (distance <= RAYON_RECHERCHE_KM) {
        // Compare la température de notre piscine avec celles autour
        if (currentTemperature <= otherPoolTemperature && currentOwner != otherPoolOwner) {
            return false;
        }
    }
    return true;
}

void mqtt_pubcallback(char* topic, byte* payload, unsigned int length) {
    USE_SERIAL.print("Message arrived on topic : ");
    USE_SERIAL.println(topic);
    USE_SERIAL.print("=> ");

    String message;
    for (int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    // Si le topic est celui des températures, mettre à jour la dernière température reçue
    if (String(topic) == TOPIC_TEMPERATURE) {
        latestTemperatureFromBroker = message.toFloat();
    }
    USE_SERIAL.println(message);
    //{'idu' : 22002183, 'idswp' : P_22002183, "granted" : "NO"}
    // si topic est celui de waterbnb check si granted vaut yes ou no
    // check si idswp est le meme que notre idswp
    if (String(topic) == TOPIC_WATERBNB) {
        StaticJsonDocument<1000> doc;
        DeserializationError error = deserializeJson(doc, message);
        //check si on arrive à deserializeJson
        if (error) {
            USE_SERIAL.print(F("deserializeJson() failed: "));
            USE_SERIAL.println(error.c_str());
            return;
        }
        // Mettre à jour les propriétés de notre modèle avec les valeurs du JSON
        String idswp = doc["idswp"].as<String>();
        String granted = doc["granted"].as<String>();
        USE_SERIAL.println(idswp);
        USE_SERIAL.println(granted);
        // Compare la température de la piscine reçue avec la notre
        if (idswp == model.owner) {
            if (granted == "YES") {
                model.occuped = true;
                // LED jaune : piscine occupée
                for(int i=0; i<NUMLEDS; i++) {
                    strip.setPixelColor(i, strip.Color(255,255, 0));
                }
            } else {
                model.occuped = false;
                // LED rouge : piscine occupée
                for(int i=0; i<NUMLEDS; i++) {
                    strip.setPixelColor(i, strip.Color(255,0, 0));
                }
            }
        }
    }


    // Si le topic est celui des piscines
    if (String(topic) == TOPIC) {
        StaticJsonDocument<1000> doc;
        DeserializationError error = deserializeJson(doc, message);
        
        //check si on arrive à deserializeJson
        if (error) {
            USE_SERIAL.print(F("deserializeJson() failed: "));
            USE_SERIAL.println(error.c_str());
            return;
        }

        // Mettre à jour les propriétés de notre modèle avec les valeurs du JSON
        float otherPoolTemperature = doc["status"]["temperature"];
        String otherPoolOwner = doc["info"]["ident"].as<String>();
        float lon = doc["location"]["gps"]["lon"];
        float lat = doc["location"]["gps"]["lat"];

        // Compare la température de la piscine reçue avec la notre
        model.hotspot = isHotspot(model.temperature, model.owner, otherPoolTemperature, otherPoolOwner, lat, lon);
    }

    // LED interne active ou non
    if (String(topic) == TOPIC_LED) {
        USE_SERIAL.print("so ... changing output to ");
        if (message == "on") {
            USE_SERIAL.println("on");
            digitalWrite(LEDBLUE, HIGH);
        } else if (message == "off") {
            USE_SERIAL.println("off");
            digitalWrite(LEDBLUE, LOW);
        }
    }
}


StaticJsonDocument<1000> model_to_piscine(esp_model *model){
    StaticJsonDocument<1000> jdoc;
    jdoc["status"]["temperature"] = model->temperature;
    jdoc["status"]["luminosity"] = model->luminosity;
    jdoc["status"]["regul"] = "OFF";
    jdoc["status"]["fire"] = false;
    jdoc["status"]["heat"] = "OFF";
    jdoc["status"]["cold"] = "OFF";
    
    jdoc["location"]["room"] = "Swimming pool Jean Bouin";
    jdoc["location"]["gps"]["lat"] = model->lat;
    jdoc["location"]["gps"]["lon"] = model->lon;
    jdoc["location"]["address"] = "Jean Bouin, 06000 Nice";

    jdoc["piscine"]["hotspot"] = model->hotspot;
    jdoc["piscine"]["occuped"] = model->occuped;
    
    jdoc["regul"]["highThreshold"] = 0;
    jdoc["regul"]["lowThreshold"] = 0;
    
    jdoc["info"]["ident"] = model->owner;
    jdoc["info"]["loc"] = "A Nice";
    jdoc["info"]["user"] = "Khalil BOUSSIK";

    jdoc["net"]["uptime"] = 0;
    jdoc["net"]["ssid"] = WiFi.SSID();
    jdoc["net"]["mac"] = WiFi.macAddress();
    jdoc["net"]["ip"] = WiFi.localIP().toString();

    jdoc["reporhost"]["target_ip"] = "127.0.0.1";
    jdoc["reporhost"]["target_port"] = 1880;
    jdoc["reporhost"]["sp"] = 2;

    return jdoc;
}

void setup() {
    Serial.begin(9600);
    strip.begin();
    tempSensor.begin();
    Serial.println("** This message will only be displayed on start or reset. **");
    pinMode(LEDRED, OUTPUT);
    pinMode(LEDGREEN, OUTPUT);
    pinMode(LEDBLUE, OUTPUT);
    ledcSetup(0, 25000, 8); // canal = 0, frequence = 25000 Hz, resolution = 8 bits
    ledcWrite(0, 0);
    // Init Wifi
    wifi_connect_multi(hostname);
    wifi_printstatus(0);
    // Init MQTT
    Serial.println("Wakeup caused by timer");
    delay(TIME_TO_UP * 1000);
    mqttclient.setServer(mqtt_server, 1883);
    mqttclient.setCallback(mqtt_pubcallback); 
    esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * 1000000LL);
}

void mqtt_subscribe_mytopics() {
    while (!mqttclient.connected()) {
        USE_SERIAL.print("Attempting MQTT connection...");
        // Attempt to connect
        String mqttclienId = "ESP32Client-";
        mqttclienId += WiFi.macAddress();
        if (mqttclient.connect(mqttclienId.c_str())){
        //if (mqttclient.connect(mqttclienId.c_str(), mqtt_user, mqtt_password)) {
            USE_SERIAL.println("connected");
            // Subscribe
            mqttclient.subscribe(TOPIC_WATERBNB);
            mqttclient.subscribe(TOPIC);
            mqttclient.subscribe(TOPIC_TEMPERATURE);  // Ajout pour s'abonner au topic des températures
        } else {
            USE_SERIAL.print("failed, rc=");
            USE_SERIAL.print(mqttclient.state());
            USE_SERIAL.println(" try again in 5 seconds");
            // Wait 5 seconds before retrying
            delay(5000);
        }
    }
}

void loop() {
    int currentTimestamp = millis();
    int delai = 5000;
    // Récupérer la température des autres piscines via MQTT et mettre à jour model.hotspot
    mqttclient.loop();
    mqtt_subscribe_mytopics();
    int sensorValue;
    tempSensor.requestTemperaturesByIndex(0);
    model.temperature = tempSensor.getTempCByIndex(0);
    model.luminosity = analogRead(A5);


    static uint32_t tick = 0;
    if ( millis() - tick > delai) { 
        tick = millis();
        // savoir si hotspot ou non 
        digitalWrite(LEDBLUE, model.hotspot);

        if (model.luminosity < SEUIL_PRESENCE) {
            model.occuped = true;
            // LED jaune : piscine occupée
            for(int i=0; i<NUMLEDS; i++) {
                strip.setPixelColor(i, strip.Color(255,255, 0));
            }
        } else {
            model.occuped = false;
            // LED verte : piscine disponible
            for(int i=0; i<NUMLEDS; i++) {
                strip.setPixelColor(i, strip.Color(0,255, 0));
            }
        }
        payload = "";
        StaticJsonDocument<1000> jdoc = model_to_piscine(&model);
        serializeJson(jdoc, payload);
        mqttclient.publish(TOPIC, payload.c_str());
    }
    strip.show();
    //esp_deep_sleep_start(); //voir avec prof sleep parceque problème ecoute
}
