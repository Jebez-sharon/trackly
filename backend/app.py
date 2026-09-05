from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text
from config import Config
from models import db
from flask_jwt_extended import JWTManager

jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=['http://localhost:5173'])
    db.init_app(app)

    jwt.init_app(app)

    from routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp)

    from routes.project_routes import project_bp
    app.register_blueprint(project_bp)

    from routes.issue_routes import issue_bp, issue_detail_bp
    app.register_blueprint(issue_bp)
    app.register_blueprint(issue_detail_bp)

    from routes.comment_routes import comment_bp
    app.register_blueprint(comment_bp)

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
