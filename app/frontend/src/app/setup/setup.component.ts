import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';

import { Router } from '@angular/router';

import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class SetupComponent implements OnInit {

  private static ENDPOINT = "/../";

  name: string = '';
  firstname: string = '';
  lastname: string = '';
  password1: string = '';
  password2: string = '';
  imprint: string = '';

  constructor(private http: HttpClient, private cookieService: CookieService, private router: Router) {
    let instance = this;

    instance.http.get(SetupComponent.ENDPOINT + 'setting/title').subscribe(resp => {
      if(resp["value"] != '') {
        router.navigate(['/']);
      }
    });
  }

  ngOnInit() {
  }

  isDisabled() {
    return this.name == '' || this.firstname == '' || this.lastname == '' || this.password1 == '' || this.password2 == '' || this.password1 != this.password2 || this.imprint == '';
  }

  setSetting(key, value, httpOptions) {
    let instance = this;

    instance.http.post(SetupComponent.ENDPOINT + 'setting/', {
      "key": key,
      "value": value,
    }, httpOptions).subscribe(resp => {
      if(!resp["result"]) {
        instance.http.put(SetupComponent.ENDPOINT + 'setting/', {
          "key": key,
          "value": value,
        }, httpOptions).subscribe(resp2 => {
        });
      }
    });
  }

  setup() {
    let instance = this;

    instance.http.put(SetupComponent.ENDPOINT + 'administrator/', {
      "firstname": instance.firstname,
      "lastname": instance.lastname,
      "password": instance.password1,
    }).subscribe(resp1 => {
      instance.http.put(SetupComponent.ENDPOINT + 'administrator/session/', {
        "firstname": instance.firstname,
        "lastname": instance.lastname,
        "password": instance.password1,
      }).subscribe(resp2 => {
        let token = resp2["uuid"];
        instance.cookieService.set("token", token);

        const httpOptions = {
          headers: new HttpHeaders({
            'Content-Type':  'application/json',
            'Token': token,
          }),
        };

        instance.setSetting('title', instance.name, httpOptions);
        instance.setSetting('imprint', instance.imprint, httpOptions);

        instance.router.navigate(['/admin']);
      });
    });
  }

}
