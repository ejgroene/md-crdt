

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


if __name__ == "__main__":
  app.run('0.0.0.0', debug=True, port=5000, ssl_context='adhoc')
