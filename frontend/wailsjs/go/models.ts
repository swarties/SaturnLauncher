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

export namespace fabric {
	
	export class LoaderVersion {
	    version: string;
	    stable: boolean;
	
	    static createFrom(source: any = {}) {
	        return new LoaderVersion(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.stable = source["stable"];
	    }
	}

}

export namespace instances {
	
	export class Instance {
	    name: string;
	    description?: string;
	    version: string;
	    uuid: string;
	    timecreated: string;
	    minram: number;
	    maxram: number;
	    fabricVersion?: string;
	
	    static createFrom(source: any = {}) {
	        return new Instance(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.version = source["version"];
	        this.uuid = source["uuid"];
	        this.timecreated = source["timecreated"];
	        this.minram = source["minram"];
	        this.maxram = source["maxram"];
	        this.fabricVersion = source["fabricVersion"];
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

export namespace modrinth {
	
	export class SearchHits {
	    project_id: string;
	    project_type: string;
	    all_project_types: string[];
	    slug: string;
	    author: string;
	    author_id: string;
	    organization: string;
	    organization_id: string;
	    title: string;
	    description: string;
	    categories: string[];
	    display_categories: string[];
	    versions: string[];
	    downloads: number;
	    follows: number;
	    icon_url: string;
	    date_created: string;
	    date_modified: string;
	    latest_version: string;
	    license: string;
	    client_side: string;
	    server_side: string;
	    environment: string[];
	    disclosure_types: string[];
	    gallery: string[];
	    featured_gallery: string;
	    color: number;
	
	    static createFrom(source: any = {}) {
	        return new SearchHits(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.project_id = source["project_id"];
	        this.project_type = source["project_type"];
	        this.all_project_types = source["all_project_types"];
	        this.slug = source["slug"];
	        this.author = source["author"];
	        this.author_id = source["author_id"];
	        this.organization = source["organization"];
	        this.organization_id = source["organization_id"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.categories = source["categories"];
	        this.display_categories = source["display_categories"];
	        this.versions = source["versions"];
	        this.downloads = source["downloads"];
	        this.follows = source["follows"];
	        this.icon_url = source["icon_url"];
	        this.date_created = source["date_created"];
	        this.date_modified = source["date_modified"];
	        this.latest_version = source["latest_version"];
	        this.license = source["license"];
	        this.client_side = source["client_side"];
	        this.server_side = source["server_side"];
	        this.environment = source["environment"];
	        this.disclosure_types = source["disclosure_types"];
	        this.gallery = source["gallery"];
	        this.featured_gallery = source["featured_gallery"];
	        this.color = source["color"];
	    }
	}
	export class DiscoverProjects {
	    hits: SearchHits[];
	    offset: number;
	    limit: number;
	    total_hits: number;
	
	    static createFrom(source: any = {}) {
	        return new DiscoverProjects(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hits = this.convertValues(source["hits"], SearchHits);
	        this.offset = source["offset"];
	        this.limit = source["limit"];
	        this.total_hits = source["total_hits"];
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
	export class Hashes {
	    sha512: string;
	    sha1: string;
	
	    static createFrom(source: any = {}) {
	        return new Hashes(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sha512 = source["sha512"];
	        this.sha1 = source["sha1"];
	    }
	}
	export class License {
	    id: string;
	    name: string;
	    url: string;
	
	    static createFrom(source: any = {}) {
	        return new License(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.url = source["url"];
	    }
	}
	export class ProjectPage {
	    client_side: string;
	    server_side: string;
	    game_versions: string[];
	    environment: string[];
	    id: string;
	    slug: string;
	    project_type: string;
	    team: string;
	    organization: string;
	    title: string;
	    description: string;
	    body: string;
	    body_url: string;
	    published: string;
	    updated: string;
	    status: string;
	    license: License;
	    downloads: number;
	    followers: number;
	    categories: string[];
	    additional_categories: string[];
	    loaders: string[];
	    versions: string[];
	    icon_url: string;
	    raw_icon_url: string;
	    issues_url: string;
	    source_url: string;
	    wiki_url: string;
	    discord_url: string;
	    donation_urls: Record<string, string>;
	    gallery: Record<string, any>;
	    color: number;
	
	    static createFrom(source: any = {}) {
	        return new ProjectPage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.client_side = source["client_side"];
	        this.server_side = source["server_side"];
	        this.game_versions = source["game_versions"];
	        this.environment = source["environment"];
	        this.id = source["id"];
	        this.slug = source["slug"];
	        this.project_type = source["project_type"];
	        this.team = source["team"];
	        this.organization = source["organization"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.body = source["body"];
	        this.body_url = source["body_url"];
	        this.published = source["published"];
	        this.updated = source["updated"];
	        this.status = source["status"];
	        this.license = this.convertValues(source["license"], License);
	        this.downloads = source["downloads"];
	        this.followers = source["followers"];
	        this.categories = source["categories"];
	        this.additional_categories = source["additional_categories"];
	        this.loaders = source["loaders"];
	        this.versions = source["versions"];
	        this.icon_url = source["icon_url"];
	        this.raw_icon_url = source["raw_icon_url"];
	        this.issues_url = source["issues_url"];
	        this.source_url = source["source_url"];
	        this.wiki_url = source["wiki_url"];
	        this.discord_url = source["discord_url"];
	        this.donation_urls = source["donation_urls"];
	        this.gallery = source["gallery"];
	        this.color = source["color"];
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
	
	export class VersionDependencies {
	    version_id: string;
	    project_id: string;
	    file_name: string;
	    dependency_type: string;
	
	    static createFrom(source: any = {}) {
	        return new VersionDependencies(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version_id = source["version_id"];
	        this.project_id = source["project_id"];
	        this.file_name = source["file_name"];
	        this.dependency_type = source["dependency_type"];
	    }
	}
	export class VersionFile {
	    id: string;
	    hashes: Hashes;
	    url: string;
	    filename: string;
	    primary: boolean;
	    size: number;
	    file_type: string;
	
	    static createFrom(source: any = {}) {
	        return new VersionFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.hashes = this.convertValues(source["hashes"], Hashes);
	        this.url = source["url"];
	        this.filename = source["filename"];
	        this.primary = source["primary"];
	        this.size = source["size"];
	        this.file_type = source["file_type"];
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
	export class VersionInfo {
	    game_versions: string[];
	    loaders: string[];
	    environment: string;
	    id: string;
	    project_id: string;
	    author_id: string;
	    featured: boolean;
	    name: string;
	    version_number: string;
	    changelog: string;
	    changelog_url: string;
	    date_published: string;
	    downloads: number;
	    version_type: string;
	    status: string;
	    requested_status: string;
	    files: VersionFile[];
	    dependencies: VersionDependencies[];
	
	    static createFrom(source: any = {}) {
	        return new VersionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.game_versions = source["game_versions"];
	        this.loaders = source["loaders"];
	        this.environment = source["environment"];
	        this.id = source["id"];
	        this.project_id = source["project_id"];
	        this.author_id = source["author_id"];
	        this.featured = source["featured"];
	        this.name = source["name"];
	        this.version_number = source["version_number"];
	        this.changelog = source["changelog"];
	        this.changelog_url = source["changelog_url"];
	        this.date_published = source["date_published"];
	        this.downloads = source["downloads"];
	        this.version_type = source["version_type"];
	        this.status = source["status"];
	        this.requested_status = source["requested_status"];
	        this.files = this.convertValues(source["files"], VersionFile);
	        this.dependencies = this.convertValues(source["dependencies"], VersionDependencies);
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

}

