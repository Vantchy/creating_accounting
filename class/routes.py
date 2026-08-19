from flask import render_template, request, jsonify
import db


def register_routes(app):
    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/api/cards", methods=["GET"])
    def get_cards():
        cards = db.load_cards()
        return jsonify(cards)

    @app.route("/api/cards", methods=["POST"])
    def post_cards():
        data = request.get_json()
        text = data.get("text", "").strip()
        owner = data.get("owner", "").strip()
        if not text:
            return jsonify({"error": "内容不能为空"}), 400
        card = db.add_card(text, owner)
        print(f"[新增卡片] id={card['id']} owner={card['owner']} text={card['text']}")
        return jsonify(card), 201

    @app.route("/api/cards/<card_id>", methods=["DELETE"])
    def delete_cards(card_id):
        owner = request.args.get("owner", "")
        cards = db.load_cards()
        card_exists = any(c["id"] == card_id for c in cards)
        if not card_exists:
            return jsonify({"error": "没有这条卡片"}), 404
        ok = db.delete_card(card_id, owner)
        if not ok:
            return jsonify({"error": "这不是你的卡片，不能删除"}), 403
        print(f"[删除卡片] id={card_id} owner={owner}")
        return jsonify({"ok": True})