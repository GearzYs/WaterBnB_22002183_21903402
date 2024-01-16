# WaterBnB_22002183_21903402

The use case is as follows:

1. A user of the WaterBnB service has a dashboard showing neighbouring swimming pools.
   Behind each pool, there is an ESP who publishes its status on the "uca/iot/pool" topic and
   gives its "name" to the pool (based on the "ident" field in the Json schema).
2. He wants to hire one of them for a swim.
   The rental request is made by clicking on the pool selected on the dashboard.
3. Access is authorised (or not) by the (paying) WaterBnB service that you will/should develop
   in the cloud (render.com)
   This is the service that opens the portal and invoices you for the service!

If you want to use a private mosquitto server, use this one hosted 24/24.
`mqtt_server = "84.235.237.236"`
`mqtt_user = "espofuca"`
`mqtt_password = "vn3syxrrGQk91YKL44JOZGno"`

Topics:
`TOPIC_WATERBNB "uca/waterbnb"`
`TOPIC_LED "uca/iot/led"`
`TOPIC_TEMPERATURE "uca/iot/temperature"`

MongoDB database link used :
`mongodb+srv://Gearz:Cga6vAfmAbACn8Ld@waterbnb.otllsi5.mongodb.net/WaterBnb?retryWrites=true&w=majority`

## **How to use the projet ?**

1. Install [Nodejs](https://nodejs.org/en/download).
2. Install [Node-red](https://nodered.org/docs/getting-started/local).
3. Install [Arduino](https://www.arduino.cc/en/software).
4. Install these packages : `Adafruit_NeoPixel`, `PubSubClient`, `DallasTemperature`, `OneWire`, `ArduinoJson`
5. Install `ESP32 Dev Module` Board
6. If you want to run the server locally, open new terminal to this repository, run `npm install .` and `node .`, it'll run on `http://localhost:3000/`
7. Open new terminal
8. Run `node-red`
9. Go to http://localhost:1880/
10. Import `nodered.json`
11. Install these palettes on node-red : `node-red-contrib-web-worldmap`, `node-red-dashboard`, `node-red-contrib-ui-led`
12. Deploy and go to `http://localhost:1880/ui/`
13. Enjoy renting pools by clicking on your ESP on the map to book it.

## **MongoDB Dashboard of swimming pools**

Here is the link to the MongoDB dashboard concerning rented swimming pools:

https://charts.mongodb.com/charts-waterbnb-gtlgz/public/dashboards/1994badc-84c4-4016-9622-456ab6852081#
