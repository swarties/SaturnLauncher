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

