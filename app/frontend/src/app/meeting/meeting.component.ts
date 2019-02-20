import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import {MatSnackBar} from '@angular/material';


@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.css']
})
export class MeetingComponent implements OnInit {

  uuid: string;
  customer: string;

  name: string = "";
  description: string = "";

  date: Date = null;
  dateStr: string = "";

  start: Date = null;
  startStr: string = "";

  stop: Date = null;
  stopStr: string = "";

  firstname: string = '';
  lastname: string = '';
  email: string = '';
  street: string = '';
  housenumber: string = '';
  place: string = '';
  plz: string = '';

  step = 1;
  stepIcon = "add_shopping_cart"

  amount = 0;

  selected = [];
  prices = {};

  roomID = 0;
  room = [];

  private static ENDPOINT = "http://192.168.178.22:5000/";

  private sub: any;

  pricesKeys() {
    return Object.keys(this.prices);
  }

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    let instance = this;

    this.sub = this.route.params.subscribe(params => {
        instance.uuid = params['uuid'];
        instance.customer = params['customer'];

        instance.http.get(MeetingComponent.ENDPOINT + "meeting/" + this.uuid).subscribe(resp => {
          if(resp != null) {
            instance.name = resp["name"];
            instance.description = resp["description"];

            instance.date = new Date(resp["date"] * 1000);
            instance.dateStr = instance.timeConverter(instance.date);

            instance.start = new Date(resp["start"] * 1000);
            instance.startStr = instance.timeConverter(instance.start);

            instance.stop = new Date(resp["stop"] * 1000);
            instance.stopStr = instance.timeConverter(instance.stop);

            instance.roomID = resp["room"];
            this.http.get(MeetingComponent.ENDPOINT + "price/").subscribe(resp => {
              if(resp != null) {
                let prices = resp['prices']

                prices.forEach(price => {
                  instance.prices[price['uuid']] = price;
                });
                instance.http.post(MeetingComponent.ENDPOINT + "ticket/", {
                  "meeting": instance.uuid,
                }).subscribe(resp2 => {
                  let reserved = resp2['reserved'];

                  instance.http.post(MeetingComponent.ENDPOINT + "seat/", {
                    "room": this.roomID,
                  }).subscribe(resp => {
                    if(resp != null) {
                      let seats = resp['seats'];

                      seats.forEach(seat => {
                        let block = seat["block"];
                        let row = seat["row"];

                        if(instance.room[block] == null) {
                          instance.room[block] = [];
                        }
                        if(instance.room[block][row] == null) {
                          instance.room[block][row] = [];
                        }

                        instance.room[block][row].push({
                          "uuid": seat["uuid"],
                          "icon": "event_seat",
                          "reserved": reserved.includes(seat["uuid"]),
                          "price": prices[0].uuid,
                        });
                      });
                    }
                  });
                });
              }
            });
          }
        });
    });
  }

  calcBlocks() {
    return 100 / this.room.length;
  }

  select(seat) {
    if(!seat.reserved) {
      if(this.selectedSeat(seat)) {
        this.selected.splice(this.selected.indexOf(seat), 1);
      } else {
        this.selected.push(seat);
      }
    }
    this.calcAmount();
  }

  selectedSeat(seat) {
    return this.selected.indexOf(seat) > -1;
  }

  calcAmount() {
    let amount = 0;
    let prices = this.prices;

    this.selected.forEach(function(seat) {
      amount += prices[seat.price].value;
    });

    this.amount = amount;
  }

  continue() {
    if(this.selected.length > 0) {
      if(this.step == 1) {
        this.stepIcon = "shopping_cart";
        this.step++;
      } else if(this.step == 2) {
        let instance = this;

        let buy = function(customerUUID) {
          instance.selected.forEach(seat => {
            instance.http.put(MeetingComponent.ENDPOINT + "ticket/", {
              "price": seat['price'],
              "seat": seat['uuid'],
              "meeting": instance.uuid,
              "customer": customerUUID,
            }).subscribe(resp2 => {
            });
          });
          instance.step++;
        }

        if(instance.customer == null) {
          instance.http.put(MeetingComponent.ENDPOINT + "customer/", {
            "email": this.email,
            "firstname": this.firstname,
            "lastname": this.lastname,
            "address": this.street + " " + this.housenumber,
            "place": this.place + " " + this.plz
          }).subscribe(resp => {
            if(resp != null) {
              buy(resp["uuid"]);
            }
          });
        } else {
          buy(instance.customer);
        }
      } else if(this.step == 3) {
      }
    }
  }

  buttonEnabled() {
    if(this.step == 1) {
      return this.selected.length <= 0;
    } else if(this.step == 2) {
      return (this.firstname == '' || this.lastname == '' || this.email == '' || this.street == '' || this.place == '' || this.housenumber == '' || this.plz == '') && this.customer == null;
    }
  }

  timeConverter(a) {
    var year = a.getFullYear();
    var month = String("0" + (a.getMonth() + 1)).slice(-2);
    var date = String("0" + a.getDate()).slice(-2);
    var hour = String("0" + a.getHours()).slice(-2);
    var min = String("0" + a.getMinutes()).slice(-2);

    var time = date + '.' + month + '.' + year + ' um ' + hour + ':' + min + ' Uhr'

    return time;
  }

  openDashboard() {
    this.router.navigate(['/customer/' + this.customer]);
  }

}
