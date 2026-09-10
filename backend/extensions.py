"""Extension instances, kept out of app.py.

Route modules need the limiter, and app.py imports the route modules, so
holding it there would be a circular import. This module imports nothing of
ours, so anything can import it.
"""

from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

jwt = JWTManager()

# Storage is in-process. That is honest for a single worker and wrong for
# several: each gunicorn worker would keep its own counters, so the effective
# limit multiplies by the worker count. Point this at Redis before running more
# than one.
#
# get_remote_address reads request.remote_addr, which behind a proxy is the
# proxy. Deploying without ProxyFix would put every visitor in one bucket and
# lock the whole app out together.
limiter = Limiter(
    key_func=get_remote_address,
    strategy="fixed-window",
)
