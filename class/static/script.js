var ownerId = Math.random().toString(36).substring(2, 10);

var input = document.getElementById("text-input");
var submitBtn = document.getElementById("submit-btn");
var cardsGrid = document.getElementById("cards-grid");
var errorArea = document.getElementById("error-area");

function showError(msg) {
  errorArea.textContent = msg;
}

function clearError() {
  errorArea.textContent = "";
}

function loadCards() {
  clearError();
  fetch("/api/cards")
    .then(function (res) {
      if (!res.ok) {
        throw new Error("服务器返回异常，状态码 " + res.status);
      }
      return res.json();
    })
    .then(function (cards) {
      renderCards(cards);
    })
    .catch(function () {
      showError("连不上服务器，请确认后端已启动");
    });
}

function renderCards(cards) {
  cardsGrid.innerHTML = "";

  if (cards.length === 0) {
    var empty = document.createElement("div");
    empty.className = "cards-empty";
    empty.textContent = "还没有留言，来写第一条吧。";
    cardsGrid.appendChild(empty);
    return;
  }

  cards.forEach(function (card) {
    var el = document.createElement("div");
    el.className = "card";

    var text = document.createElement("div");
    text.className = "card__text";
    text.textContent = card.text;

    var footer = document.createElement("div");
    footer.className = "card__footer";

    var date = document.createElement("span");
    date.className = "card__date";
    date.textContent = card.created_at;

    footer.appendChild(date);

    if (card.owner === ownerId) {
      var delBtn = document.createElement("button");
      delBtn.className = "card__delete";
      delBtn.textContent = "删除";
      delBtn.addEventListener("click", function () {
        deleteCard(card.id);
      });
      footer.appendChild(delBtn);
    }

    el.appendChild(text);
    el.appendChild(footer);
    cardsGrid.appendChild(el);
  });
}

function addCard() {
  var text = input.value.trim();
  if (!text) {
    showError("内容不能为空");
    return;
  }

  clearError();
  submitBtn.disabled = true;

  fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text, owner: ownerId }),
  })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          throw new Error(data.error || "提交失败");
        });
      }
      return res.json();
    })
    .then(function () {
      input.value = "";
      loadCards();
    })
    .catch(function (err) {
      showError(err.message);
    })
    .finally(function () {
      submitBtn.disabled = false;
    });
}

function deleteCard(cardId) {
  clearError();
  fetch("/api/cards/" + cardId + "?owner=" + ownerId, { method: "DELETE" })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          throw new Error(data.error || "删除失败");
        });
      }
      return res.json();
    })
    .then(function () {
      loadCards();
    })
    .catch(function (err) {
      showError(err.message);
    });
}

submitBtn.addEventListener("click", addCard);
input.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    addCard();
  }
});

loadCards();