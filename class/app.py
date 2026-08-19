from flask import Flask
import config
from routes import register_routes

app = Flask(__name__)
app.json.ensure_ascii = False
app.json.sort_keys = False

register_routes(app)

if __name__ == "__main__":
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
