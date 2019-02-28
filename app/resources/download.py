from flask import Flask, render_template, make_response
import pdfkit
from config import config
from api import api, db
from models.ticket import TicketModel
from models.meeting import MeetingModel
from models.seat import SeatModel
from models.price import PriceModel

from datetime import datetime

def register_download(app: Flask):

    @app.route('/download/<uuid>')
    def render_download(uuid):
        ticket = TicketModel.query.filter_by(uuid=uuid).first()

        if ticket:
            if ticket.paid:
                meeting = MeetingModel.query.filter_by(uuid=ticket.meeting_id).first()
                seat = SeatModel.query.filter_by(uuid=ticket.seat_id).first()
                seats = SeatModel.query.filter_by(block=seat.block, row=seat.row, room_id=meeting.room).all()
                price = PriceModel.query.filter_by(uuid=ticket.price_id).first()

                date = datetime.fromtimestamp(meeting.date).strftime('%d.%m.%Y um %H:%M Uhr')

                html = render_template('ticket.html', uuid=uuid, date=date, seats=seats, seat=seat, price=price)

                pdf = pdfkit.from_string(html, False)

                response = make_response(pdf)

                response.headers['Content-Type'] = 'application/pdf'
                response.headers['Content-Disposition'] = 'attachment; filename=ticket' + tickte.uuid

                return response

        return '', 404