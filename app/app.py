from flask import Flask

from resources.render import register_render
from resources.customer import customer_api

from config import config
from api import db, api
from flask_cors import CORS
from time import sleep

from models.customer import CustomerModel
from models.meeting import MeetingModel
from models.price import PriceModel
from models.room import RoomModel
from models.seat import SeatModel
from models.setting import SettingModel
from models.customer import CustomerModel
from models.ticket import TicketModel

import os


def create_app() -> Flask:
    frontend = os.path.abspath(config["FRONTEND"])
    app: Flask = Flask("smarttickets", template_folder=frontend)

    app.config.update(**config)

    with app.app_context():
        if config["CROSS_ORIGIN"]:
            CORS(app)

        register_render(app)

        register_extensions(app)

        register_namespaces()

        setup_database()

    return app


def register_extensions(app: Flask) -> None:
    db.init_app(app)
    api.init_app(app)


def register_namespaces() -> None:
    api.add_namespace(customer_api)


def setup_database() -> None:
    while True:
        try:
            db.create_all()
            break
        except Exception as e:
            sleep(2)


if __name__ == '__main__':
    app: Flask = create_app()
    app.run(host='0.0.0.0', port=5000)