

import flask
app = flask.Flask(__name__)

db = []

@app.route("/")
def main():
    return app.send_static_file('index.html')

@app.route("/commit", methods=['POST'])
def commit():
    db.append(flask.request.json)
    return "OK"

@app.route("/fetch")
def fetch():
    return flask.jsonify(db)
