export namespace auth {
	
	export class AuthSession {
	    username: string;
	    uuid: string;
	    RefreshToken: string;
	    Uhs: string;
	    xuid: string;
	
	    static createFrom(source: any = {}) {
	        return new AuthSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.username = source["username"];
	        this.uuid = source["uuid"];
	        this.RefreshToken = source["RefreshToken"];
	        this.Uhs = source["Uhs"];
	        this.xuid = source["xuid"];
	    }
	}

}

export namespace download {
	
	export class Version {
	    id: string;
	    type: string;
	    url: string;
	    sha1: string;
	
	    static createFrom(source: any = {}) {
	        return new Version(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.url = source["url"];
	        this.sha1 = source["sha1"];
	    }
	}

}

export namespace instances {
	
	export class Instance {
	    name: string;
	    version: string;
	    uuid: string;
	    timecreated: string;
	    minram: number;
	    maxram: number;
	
	    static createFrom(source: any = {}) {
	        return new Instance(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.uuid = source["uuid"];
	        this.timecreated = source["timecreated"];
	        this.minram = source["minram"];
	        this.maxram = source["maxram"];
	    }
	}
	export class Ram {
	    TotalRamMB: number;
	
	    static createFrom(source: any = {}) {
	        return new Ram(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.TotalRamMB = source["TotalRamMB"];
	    }
	}

}

