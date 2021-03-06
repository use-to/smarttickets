import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import {MatSnackBar} from '@angular/material';

import * as data from '../endpoint.json';

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.css']
})
export class MeetingComponent implements OnInit {

  uuid: string;
  customer: string;

  customerToken: string;

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
  email2: string = '';
  street: string = '';
  housenumber: string = '';
  place: string = '';
  plz: string = '';
  dsgvo: boolean = false;

  step = 1;
  stepIcon = "add_shopping_cart"

  amount = 0;

  selected = [];
  prices = {};

  roomID = 0;
  room = [];

  private sub: any;

  order1 = '';
  order2 = '';
  order3 = '';

  offset = 0;
  stage = [];

  progress = false;

  question_mail: string = '';
  question_mail_subject: string = '';
  questions: string = '';

  buy_limit = -1;

  active: boolean;

  pricesKeys() {
    return Object.keys(this.prices);
  }

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    let instance = this;

    instance.getSetting('order1', function(value) {
      instance.order1 = value;
    });
    instance.getSetting('order2', function(value) {
      instance.order2 = value;
    });
    instance.getSetting('order3', function(value) {
      instance.order3 = value;
    });

    instance.getSetting('question_mail', function(value) {
      instance.question_mail = value;
    });

    instance.getSetting('question_mail_subject', function(value) {
      instance.question_mail_subject = value;
    });

    this.sub = this.route.params.subscribe(params => {
        instance.uuid = params['uuid'];
        instance.customer = params['customer'];

        instance.getSetting('buy_limit', function(value) {
          if(value != '' && !isNaN(value) && value >= 0) {
            instance.buy_limit = value;
            if(instance.customer != null && instance.customer != '') {
              instance.http.post(data["endpoint"] + "ticket/customer/" + instance.customer, {}).subscribe(resp => {
                if(instance.buy_limit >= 0) {
                  let amount = resp["tickets"].length;
                  if(instance.buy_limit > amount) {
                    instance.buy_limit -= amount;
                  } else {
                    instance.buy_limit = 0;
                  }
                }
              });
            }
          }
        });

        instance.http.get(data["endpoint"] + "meeting/" + this.uuid).subscribe(resp => {
          if(resp != null) {
            instance.name = resp["name"];
            instance.description = resp["description"];

            instance.date = new Date(resp["date"] * 1000);
            instance.dateStr = instance.timeConverter(instance.date);

            instance.start = new Date(resp["start"] * 1000);
            instance.startStr = instance.timeConverter(instance.start);

            instance.stop = new Date(resp["stop"] * 1000);
            instance.stopStr = instance.timeConverter(instance.stop);


            let now = new Date(Date.now());
            instance.active = instance.stop.getTime() > now.getTime();

            instance.roomID = resp["room"];
            this.http.get(data["endpoint"] + "price/").subscribe(resp => {
              if(resp != null) {
                let prices = resp['prices'];

                prices.sort(function(a,b) {
                  if(a.value < b.value) {
                    return 1;
                  }
                  if(a.value > b.value) {
                    return -1;
                  }
                  return 0;
                });

                prices.forEach(price => {
                  instance.prices[price['uuid']] = price;
                });
                instance.http.post(data["endpoint"] + "ticket/", {
                  "meeting": instance.uuid,
                }).subscribe(resp2 => {
                  let reserved = resp2['reserved'];

                  instance.http.post(data["endpoint"] + "seat/", {
                    "room": this.roomID,
                  }).subscribe(resp => {
                    if(resp != null) {
                      let seats = resp['seats'];

                      seats.forEach(seat => {
                        let block = seat["block"];
                        let row = seat["row"];

                        if(instance.stage[block] == null) {
                          instance.stage[block] = [];
                        }

                        if(instance.room[block] == null) {
                          instance.room[block] = [];
                        }

                        if(row < 0) {
                          if(instance.stage[block][row * -1] == null) {
                            instance.stage[block][row * -1] = [];
                          }
                        } else {
                          if(instance.room[block][row] == null) {
                            instance.room[block][row] = [];
                          }
                        }

                        let icon = "event_seat";

                        if(seat.type == 1) {
                          icon = "";
                        } else
                        if(seat.type == 2) {
                          icon = "texture";
                        } else
                        if(seat.type == 3) {
                          icon = "texture";
                        } else
                        if(seat.type == 4) {
                          icon = "accessible";
                        }

                        if(row < 0 && seat["type"] == 2) {
                          instance.stage[block][row * -1].push({
                            "uuid": seat["uuid"],
                            "icon": icon,
                            "type": seat["type"],
                            "block": block,
                            "row": row * -1,
                          });
                        } else {
                          instance.room[block][row].push({
                            "uuid": seat["uuid"],
                            "icon": icon,
                            "type": seat["type"],
                            "block": block,
                            "row": row,
                            "reserved": reserved.includes(seat["uuid"]),
                            "price": prices[0].uuid,
                          });
                        }
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

  openMail() {
    window.open("mailto:" + this.question_mail + "?subject=" + this.question_mail_subject, '_self');
  }

  getPositionOfSeat(seat) {
    return this.room[seat["block"]][seat["row"]].indexOf(seat) + 1;
  }

  calcBreak() {
    let max = 0;

    this.room.forEach(block => {
      if(max < block.length) {
        max = block.length;
      }
    });

    return max;
  }

  clearOffset() {
    this.offset = 0;
  }

  calcOffset(row) {
    let stage = true;

    if(row != null) {
      row.forEach(seat => {
        if(seat != null && seat["type"] != 2) {
          stage = false;
        }
      });

      if(stage) {
        this.offset++;
      }

      return !stage;
    } else {
      return false;
    }
  }

  getSetting(key, callback) {
    this.http.get(data["endpoint"] + 'setting/' + key).subscribe(resp => {
      callback(resp["value"]);
    });
  }

  calcBlocks() {
    return 100 / this.room.length;
  }

  select(seat) {
    if(this.active) {
      if((seat.type == 0 || seat.type == 4) && !seat["reserved"]) {
        if(this.selectedSeat(seat)) {
          this.selected.splice(this.selected.indexOf(seat), 1);
        } else if(this.buy_limit < 0 || this.selected.length < this.buy_limit) {
          this.selected.push(seat);
        }
      }
      this.calcAmount();
    }
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
          let tickets = [];
          instance.selected.forEach(seat => {
            tickets.push({
              "seat": seat['uuid'],
              "price": seat['price'],
            });
          });
          instance.http.put(data["endpoint"] + "ticket/", {
            "buy": tickets,
            "meeting": instance.uuid,
            "customer": customerUUID,
          }).subscribe(resp2 => {
            instance.progress = false;
          });
          instance.step++;
        }

        instance.progress = true;

        if(instance.customer == null) {
          instance.http.put(data["endpoint"] + "customer/", {
            "email": this.email,
            "firstname": this.firstname,
            "lastname": this.lastname,
            "address": this.street + " " + this.housenumber,
            "place": this.place + " " + this.plz,
          }).subscribe(resp => {
            if(resp != null) {
              instance.customerToken = resp["uuid"];
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

  back() {
    this.step--;
  }

  buttonEnabled() {
    if(!this.active) {
      return true;
    }
    if(this.step == 1) {
      return this.selected.length <= 0;
    } else if(this.step == 2) {
      return ((this.firstname == '' || this.lastname == '' || this.email == '' || this.email2 == '' || this.email != this.email2 || this.street == '' || this.place == '' || this.housenumber == '' || this.plz == '' || !this.dsgvo) && this.customer == null) || this.progress;
    }
    return true;
  }

  buttonBackEnabled() {
    if(this.step == 2) {
      return false;
    }
    return true;
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
