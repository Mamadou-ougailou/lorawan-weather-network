import paho.mqtt.client as mqtt

# Identifiants et paramètres
BROKER = "mqtt.univ-cotedazur.fr"
PORT = 443
USER = "fablab2122"
PASS = "2122"   
TOPIC = "ttn/v3/fablab2223@ttn/devices/weather-station-davis/up"

# Que faire quand on se connecte
def on_connect(client, userdata, flags, rc):
    print(f"Connecté avec le code de retour: {rc}")
    client.subscribe(TOPIC)
    print(f"En écoute sur le topic : {TOPIC} ...")

# Que faire quand on reçoit un message
def on_message(client, userdata, msg):
    print(f"Message reçu sur {msg.topic}:")
    print(msg.payload.decode('utf-8'))
    print(" * 30")

# Configuration du client pour utiliser les WebSockets (WSS)
client = mqtt.Client(transport="websockets" )
client.username_pw_set(USER, PASS)
client.tls_set() # Active le chiffrement TLS (indispensable sur le port 443)

client.on_connect = on_connect
client.on_message = on_message

# Connexion et boucle d'écoute
print(f"Tentative de connexion en cours...")
client.connect(BROKER, PORT, 60)
client.loop_forever()
