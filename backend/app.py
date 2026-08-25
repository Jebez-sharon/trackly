from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text
from config import Config
from models import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=['http://localhost:5173'])
    db.init_app(app)

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'message': 'Trackly API ready'}),200

    @app.route('/api/health/db')
    def health_db():
        try:
            with db.engine.connect() as conn:
                conn.execute(text('SELECT 1'))
            return jsonify({'status':'ok', 'database':'connected'}),200
        except Exception as exc:
            return jsonify({'status':'error','database':str(exc)}), 503

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
