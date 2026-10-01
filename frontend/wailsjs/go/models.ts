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

}

