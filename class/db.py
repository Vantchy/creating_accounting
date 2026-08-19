import json
import os
import random
import string
from datetime import datetime

import config


def load_cards():
    if not os.path.exists(config.CARDS_FILE):
        os.makedirs(config.DATA_DIR, exist_ok=True)
        save_cards([])
        return []
    with open(config.CARDS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_cards(cards):
    os.makedirs(config.DATA_DIR, exist_ok=True)
    with open(config.CARDS_FILE, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)


def add_card(text, owner):
    card = {
        "id": "".join(random.choices(string.ascii_letters + string.digits, k=8)),
        "text": text,
        "owner": owner,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    cards = load_cards()
    cards.insert(0, card)
    save_cards(cards)
    return card


def delete_card(card_id, owner):
    cards = load_cards()
    for i, card in enumerate(cards):
        if card["id"] == card_id and card["owner"] == owner:
            cards.pop(i)
            save_cards(cards)
            return True
    return False