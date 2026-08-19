import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CARDS_FILE = os.path.join(DATA_DIR, "cards.json")

HOST = "0.0.0.0"
PORT = 5000
DEBUG = True
