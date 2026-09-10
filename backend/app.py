from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.exceptions import HTTPException
from config import Config
from models import db
from flask_limiter.errors import RateLimitExceeded
from extensions import jwt, limiter

def register_error_handlers(app):
    """Every failure leaves this API as JSON, never HTML.

    Without these, an unhandled exception returns Werkzeug's HTML error
    page. The frontend reads `data.error || data.msg`, finds neither in
    HTML, and shows "Request failed with status code 500" with no cause.
    """

    @app.errorhandler(RateLimitExceeded)
    def handle_rate_limit(e):
        # Without this the description is the raw limit string, so the user is
        # shown "10 per 1 minute". Retry-After carries the real answer.
        app.logger.warning('Rate limit hit on %s %s', request.method, request.path)
        return jsonify({
            'error':'Too many attempts. Wait a moment and try again.'
        }), 429

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        return jsonify({'error':e.description}), e.code

    @app.errorhandler(IntegrityError)
    def handle_integrity_error(e):
        db.session.rollback()
        app.logger.warning('IntegrityError on %s %s', request.method, request.path)
        return jsonify({'error':'That conflicts with something that already exists.'}),409

    @app.errorhandler(SQLAlchemyError)
    def handle_db_error(e):
        db.session.rollback()
        app.logger.exception('Database error on %s %s', request.method, request.path)
        return jsonify({'error':'A database error occurred.'}), 500

    @app.errorhandler(Exception)
    def handle_unexpected(e):
        db.session.rollback()
        app.logger.exception('Unhandled error on %s %s', request.method, request.path)
        return jsonify({'error':'Something went wrong on our side.'}), 500

def create_app(config_object=Config):
    """config_object is overridable so the tests can point at an in-memory
    database instead of the real one."""
    app = Flask(__name__)
    app.config.from_object(config_object)

    CORS(app, origins=['http://localhost:5173'])
    db.init_app(app)

    jwt.init_app(app)
    limiter.init_app(app)

    from routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp)

    from routes.project_routes import project_bp, project_detail_bp
    app.register_blueprint(project_bp)
    app.register_blueprint(project_detail_bp)

    from routes.issue_routes import issue_bp, issue_detail_bp
    app.register_blueprint(issue_bp)
    app.register_blueprint(issue_detail_bp)

    from routes.comment_routes import comment_bp
    app.register_blueprint(comment_bp)

    from routes.org_routes import org_bp
    app.register_blueprint(org_bp)

    register_error_handlers(app)

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'message': 'Trackly API ready'}),200

    @app.route('/api/health/db')
    def health_db():
        try:
            with db.engine.connect() as conn:
                conn.execute(text('SELECT 1'))
            return jsonify({'status':'ok', 'database':'connected'}),200
        except Exception:
            app.logger.exception('Database health check failed')
            return jsonify({'status':'error','database':'unreachable'}),503
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
