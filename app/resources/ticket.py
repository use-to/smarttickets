from flask_restplus import Namespace, Resource, fields, abort
from api import api, db, mail
from flask import request
from models.ticket import TicketModel
from models.meeting import MeetingModel
from models.seat import SeatModel
from models.room import RoomModel
from models.price import PriceModel
from models.customer import CustomerModel
from models.setting import SettingModel
from session import require_session
from config import config
from flask_mail import Mail, Message
from datetime import datetime

ticket_api = Namespace('ticket')

requestSchema = {
    "CreateTicketModel": api.model("create ticket", {
        "price": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                                      description="uuid of price"),
        "seat": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                                      description="uuid of seat"),
        "meeting": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                                      description="uuid of meeting"),
        "customer": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                                      description="uuid of customer"),
    }),
    "SpecificTicketModel": api.model("specific ticket", {
        "uuid": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                              description="uuid of ticket"),
    }),
    "SpecificMeetingModel": api.model("specific meeting", {
        "meeting": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                              description="uuid of meeting"),
    }),
    "SpecificCustomerModel": api.model("specific customer", {
        "customer": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                              description="uuid of customer"),
    }),
}

responseSchema = {
    "TicketModel": api.model("ticket", {
        "uuid": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                                      description="uuid of ticket"),
        "paid": fields.Boolean(required=True),
        "customer": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                                      description="uuid of customer"),
        "price": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                                      description="uuid of price"),
        "seat": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                                      description="uuid of seat"),
        "meeting": fields.String(required=True, example="12abc34d5efg67hi89j1klm2nop3pqrs",
                                      description="uuid of meeting"),
    }),
    "SuccessModel": api.model("success", {
        "result": fields.Boolean(required=True)
    })
}

@ticket_api.route('/')
@ticket_api.doc('general ticket actions')
class GeneralTicketService(Resource):

    @ticket_api.doc('create a ticket')
    @ticket_api.expect(requestSchema["CreateTicketModel"])
    @ticket_api.marshal_with(responseSchema["TicketModel"])
    def put(self):
        price_uuid = request.json["price"]
        seat_uuid = request.json["seat"]
        meeting_uuid = request.json["meeting"]
        customer_uuid = request.json["customer"]

        seat: SeatModel = SeatModel.query.filter_by(uuid=seat_uuid).first()

        if seat.type == 0:
            meeting: MeetingModel = MeetingModel.query.filter_by(uuid=meeting_uuid).first()

            now = int(datetime.now().strftime("%s"))

            if meeting.start < now and now < meeting.stop:
                price: PriceModel = PriceModel.query.filter_by(uuid=price_uuid).first()
                customer: CustomerModel = CustomerModel.query.filter_by(uuid=customer_uuid).first()

                if TicketModel.query.filter_by(seat_id=seat.uuid, meeting_id=meeting.uuid).first():
                    return { "result": False }

                ticket: TicketModel = TicketModel.create(customer, meeting, seat, price)

                seat.reserved = True

                db.session.commit()

                return ticket.serialize

        return {
            "result": False
        }

    @ticket_api.doc('get reserved tickets')
    @ticket_api.expect(requestSchema["SpecificMeetingModel"])
    def post(self):
        meeting_uuid = request.json["meeting"]

        meeting: MeetingModel = MeetingModel.query.filter_by(uuid=meeting_uuid).first()

        tickets = TicketModel.query.filter_by(meeting_id=meeting.uuid).all()

        invisible = SeatModel.query.filter_by(room_id=meeting.room, type=1)
        stage = SeatModel.query.filter_by(room_id=meeting.room, type=2)
        technology = SeatModel.query.filter_by(room_id=meeting.room, type=3)

        return {
            "reserved": [t.seat_id for t in tickets],
            "invisible": [s.uuid for s in invisible],
            "stage": [s.uuid for s in stage],
            "technology": [s.uuid for s in technology],
        }

@ticket_api.route('/<string:uuid>')
@ticket_api.doc('specific ticket actions')
class SpecificPriceService(Resource):

    @ticket_api.doc('get a ticket')
    @ticket_api.expect(requestSchema["SpecificTicketModel"])
    @ticket_api.marshal_with(responseSchema["SuccessModel"])
    @ticket_api.response(404, "Not Found", {})
    def get(self, uuid):
        ticket: TicketModel = TicketModel.query.filter_by(uuid=uuid).first()

        return ticket.serialize

    @ticket_api.doc('pay a ticket')
    @ticket_api.response(404, "Not Found", {})
    @require_session
    def post(self, uuid, session):
        pay = request.json["pay"];

        ticket: TicketModel = TicketModel.query.filter_by(uuid=uuid).first()

        ticket.paid = pay

        db.session.commit()

        if config["MAIL_ENABLED"] and ticket.paid:
            msg_title = SettingModel.query.filter_by(key="ticket_mail_title").first().value
            msg_content = SettingModel.query.filter_by(key="ticket_mail_content").first().value

            msg = Message(msg_title)

            ticket_url = str(request.host_url) + 'download/' + ticket.uuid

            msg_content = msg_content.replace('<name>', firstname + ' ' + lastname)
            msg_content = msg_content.replace('<download>', '<a href="' + ticket_url + '">' + ticket_url + '</a>')
            msg_content = msg_content.replace('\n', '<br>')

            msg.html = msg_content

            mail.send(msg)

        return ticket.serialize

    @ticket_api.doc('delete a ticket')
    @ticket_api.expect(requestSchema["SpecificTicketModel"])
    @ticket_api.marshal_with(responseSchema["SuccessModel"])
    @ticket_api.response(404, "Not Found", {})
    def delete(self, uuid):
        ticket: TicketModel = TicketModel.query.filter_by(uuid=uuid).first()

        if not ticket.paid:
            db.session.delete(ticket)
            db.session.commit()

            return True

        return False

@ticket_api.route('/customer/<string:uuid>')
@ticket_api.doc('general customer ticket actions')
class GeneralCustomerTicketService(Resource):

    @ticket_api.doc('get reserved tickets')
    @ticket_api.expect(requestSchema["SpecificCustomerModel"])
    def post(self, uuid):
        customer: CustomerModel = CustomerModel.query.filter_by(uuid=uuid).first()

        tickets: TicketModel = TicketModel.query.filter_by(customer=customer.uuid).all()

        return {"tickets": [t.serialize for t in tickets]}
