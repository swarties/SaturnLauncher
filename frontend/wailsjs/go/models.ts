export namespace main {
	
	export class MicrosoftAccessToken {
	    access_token: string;
	    refresh_token: string;
	    expires_in: number;
	
	    static createFrom(source: any = {}) {
	        return new MicrosoftAccessToken(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.access_token = source["access_token"];
	        this.refresh_token = source["refresh_token"];
	        this.expires_in = source["expires_in"];
	    }
	}
	export class MicrosoftOAuthPayload {
	    user_code: string;
	    device_code: string;
	    verification_uri: string;
	    interval: number;
	    expires_in: number;
	
	    static createFrom(source: any = {}) {
	        return new MicrosoftOAuthPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.user_code = source["user_code"];
	        this.device_code = source["device_code"];
	        this.verification_uri = source["verification_uri"];
	        this.interval = source["interval"];
	        this.expires_in = source["expires_in"];
	    }
	}
	export class XBLPayload {
	    Token: string;
	    // Go type: struct { Xui []struct { Uhs string "json:\"uhs\"" } "json:\"xui\"" }
	    DisplayClaims: any;
	
	    static createFrom(source: any = {}) {
	        return new XBLPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Token = source["Token"];
	        this.DisplayClaims = this.convertValues(source["DisplayClaims"], Object);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class XSTSPayload {
	    Token: string;
	
	    static createFrom(source: any = {}) {
	        return new XSTSPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Token = source["Token"];
	    }
	}

}

