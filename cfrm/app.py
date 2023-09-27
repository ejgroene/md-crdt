

import flask
app = flask.Flask(__name__)


@app.route("/")
def main():
    return app.send_static_file('index.html')
