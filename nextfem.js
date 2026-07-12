// NextFEM REST API JavaScript wrapper
// Disable HTTPS warnings for development
// Note: In production, use proper SSL certificates

function sbool(arg) {
    if (arg === "True") {
        return true;
    } else {
        return false;
    }
}

function qt(s) {
    try {
        return encodeURIComponent(s);
    } catch (e) {
        return String(s);
    }
}

function des(s) {
    try {
        return JSON.parse(s);
    } catch (e) {
        return String(s);
    }
}

function str(s) {
    return String(s);
}

function dict(entries) {
  if (entries == null) {
    return {};
  }
  
  if (typeof entries === 'object' && !Array.isArray(entries)) {
    return entries;
  }
  
  if (Array.isArray(entries) && entries.length > 0) {
    // Verifica se è un array di coppie (ogni elemento è un array)
    if (Array.isArray(entries[0])) {
      return Object.fromEntries(entries);
    }
  }
  
  return entries;
}

class vert3 {
    constructor(...args) {
        this.num = args.length > 0 && args[args.length - 1]._num !== undefined ? args[args.length - 1]._num : "0";
        this.X = 0.0;
        this.Y = 0.0;
        this.Z = 0.0;

        if (args.length === 3) {
            this.X = args[0];
            this.Y = args[1];
            this.Z = args[2];
        } else if (args.length === 1 && Array.isArray(args[0])) {
            const arr = args[0];
            for (let i = 0; i < Math.min(3, arr.length); i++) {
                if (i === 0) this.X = arr[i];
                else if (i === 1) this.Y = arr[i];
                else if (i === 2) this.Z = arr[i];
            }
        }
    }

    toDict() {
        return {
            num: this.num,
            X: this.X,
            Y: this.Y,
            Z: this.Z
        };
    }
}

class NextFEMrest {
    constructor(_baseUrl = null, _user = "", _msg = true) {
        this.headers = {};
        this.baseUrl = _baseUrl === null ? "http://localhost:5151" : String(_baseUrl);
        this.user = _user;
        this.msg = _msg;
        if (this.user !== "") {
            this.headers["user"] = this.user;
        }
    }

    setHeaders(headersDict) {
        if (headersDict !== null && headersDict !== undefined) {
            for (let dd in headersDict) {
                this.headers[dd] = headersDict[dd];
            }
        }
    }

    async nfrest(method, command, body = null, heads = null) {
        const url = this.baseUrl + command;
        const hds = { ...this.headers };
        if (heads !== null && heads !== undefined) {
            for (let dd in heads) {
                hds[dd] = heads[dd];
            }
        }

        const options = {
            method: method,
            headers: hds,
            body: body !== null ? JSON.stringify(body) : null
        };

        try {
            const response = await fetch(url, options);
            if (this.msg) console.log("*** " + this.user + " :: " + method + " " + command + " " + response.status);
            return await response.text();
        } catch (error) {
            if (this.msg) console.error("Error:", error);
            return "";
        }
    }

    async nfrestB(method, command, body = null, heads = null) {
        const url = this.baseUrl + command;
        const hds = { ...this.headers };
        if (heads !== null && heads !== undefined) {
            for (let dd in heads) {
                hds[dd] = heads[dd];
            }
        }

        const options = {
            method: method,
            headers: hds,
            body: body !== null ? JSON.stringify(body) : null
        };

        try {
            const response = await fetch(url, options);
            return await response.arrayBuffer();
        } catch (error) {
            console.error("Error:", error);
            return new ArrayBuffer();
        }
    }

    // Server methods
    async saveUser() {
        return sbool(await this.nfrest('GET', '/op/saveuser'));
    }

    async userFileB(filename) {
        try {
            const bts = await this.nfrestB('GET', '/op/userfile', null, { "path": filename });
            if (bts.byteLength === 0) {
                return new ArrayBuffer();
            }
            return bts;
        } catch (e) {
            return new ArrayBuffer();
        }
    }

    async userFile(filename, localPath) {
        try {
            const bts = await this.nfrestB('GET', '/op/userfile', null, { "path": filename });
            if (bts.byteLength === 0) {
                return false;
            }
            // In Node.js environment, write to file
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                fs.writeFileSync(localPath, Buffer.from(bts));
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    async sendFile(localPath, remoteFolder = null) {
        try {
            // This requires file system access (Node.js only)
            if (typeof require === 'undefined') {
                console.error("File operations only available in Node.js");
                return "Error: File operations not available";
            }
            const fs = require('fs');
            const path = require('path');
            const filename = path.basename(localPath);
            const fileContent = fs.readFileSync(localPath);

            const headers = { ...this.headers };
            if (remoteFolder) {
                headers['path'] = remoteFolder;
            }

            const formData = new FormData();
            formData.append('file', new Blob([fileContent]), filename);

            const url = this.baseUrl + '/op/userfile';
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (this.msg) {
                console.log("*** " + this.user + " :: POST /op/userfile " + response.status);
            }
            return await response.text();
        } catch (e) {
            return "Error in sending file: " + String(e);
        }
    }

    async userFiles() {
        try {
            return des(await this.nfrest('GET', '/op/userfiles', null, null));
        } catch (e) {
            return ["User not logged-in"];
        }
    }

    // API methods
    async activeBarsDiameters() {
/*        ''' Get a list of active rebar diameters in the model
        
        
        Returns:
            Array of Int32
        '''*/
        return des(await this.nfrest('GET', '/element/rebar/barsdiam', null, null));}
    async activeHoopsDiameters() {
/*        ''' Get a list of active bar diameters for hoops/stirrups
        
        
        Returns:
            Array of Int32
        '''*/
        return des(await this.nfrest('GET', '/element/rebar/hoopsdiam', null, null));}
    async addBeam(n1, n2, sect=0, mat=0, sect2=0) {
/*        ''' Add a new beam to the model. Existing results will be deleted.
        
        Args:
            n1: First node ID
            n2: Second node ID
            sect (optional): Optional section ID
            mat (optional): Optional material ID
            sect2 (optional): Optional section ID of the section at the end of the beam

        Returns:
            The ID of the added elem
        '''*/
        return await this.nfrest('GET', '/element/add/beam/'+qt(n1)+'/'+qt(n2)+'/'+str(sect)+'/'+str(mat)+'/'+str(sect2)+'', null, null);}
    async addBeamLoad(elem, value1, value2, position1, position2, direction, loadcase, local=false) {
/*        ''' Add a distributed load on the specified beam
        
        Args:
            elem: Beam element retaining the load
            value1: Initial value
            value2: Final value
            position1: Initial position
            position2: Final position
            direction: Direction of the load: 1=X, 2=Y, 3=Z, 4=RX, 5=RY, 6=RZ
            loadcase: Name of the loadcase
            local (optional): Optional, default is false. True if load has been defined locally

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/element/beamadd/'+qt(elem)+'/'+str(value1)+'/'+str(value2)+'/'+str(position1)+'/'+str(position2)+'/'+str(direction)+'/'+qt(loadcase)+'/'+str(local)+'', null, null));}
    async addBeamLoadA(elem, values, positions, direction, loadcase, local=false) {
/*        ''' Add a distributed load on the specified beam
        
        Args:
            elem: Beam element retaining the load
            values: Array of load values
            positions: Array of load positions
            direction: Direction of the load: 1=X, 2=Y, 3=Z, 4=RX, 5=RY, 6=RZ
            loadcase: Name of the loadcase
            local (optional): Optional, default is false. True if load has been defined locally

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/element/beamaddA/'+qt(elem)+'/'+str(direction)+'/'+qt(loadcase)+'/'+str(local)+'', null, dict([("values",JSON.stringify(values)),("positions",JSON.stringify(positions))])));}
    async addBeamLoadU(elem, value, direction, loadcase, local=false) {
/*        ''' Add a uniformly distributed load on the specified beam
        
        Args:
            elem: Beam element retaining the load
            value: Load value
            direction: Direction of the load: 1=X, 2=Y, 3=Z, 4=RX, 5=RY, 6=RZ
            loadcase: Name of the loadcase
            local (optional): Optional, default is false. True if load has been defined locally

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/element/beamaddU/'+qt(elem)+'/'+str(value)+'/'+str(direction)+'/'+qt(loadcase)+'/'+str(local)+'', null, null));}
    async addBeamWithID(n1, n2, ID, sect=0, mat=0, sect2=0) {
/*        ''' Add a new beam to the model with the desired ID. Existing results will be deleted.
        
        Args:
            n1: First node ID
            n2: Second node ID
            ID: Element ID
            sect (optional): Optional section ID
            mat (optional): Optional material ID
            sect2 (optional): Optional section ID of the section at the end of the beam

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/element/add/beamwithid/'+qt(n1)+'/'+qt(n2)+'/'+qt(ID)+'/'+str(sect)+'/'+str(mat)+'/'+str(sect2)+'', null, null));}
    async addBoxSection(Lz, Ly, tw, tf1, tf2) {
/*        ''' Add a new beam box section to the model.
        
        Args:
            Lz: Outer base
            Ly: Outer height
            tw: Wall thickness
            tf1: Top flange thickness
            tf2: Bottom flange thickness

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/box/'+str(Lz)+'/'+str(Ly)+'/'+str(tw)+'/'+str(tf1)+'/'+str(tf2)+'', null, null));}
    async addCircleInSection(sectionID, diameter, centerX, centerY, isEmpty=false, material=0, doNotCenter=false) {
/*        ''' Add a circular figure in the selected section
        
        Args:
            sectionID: ID of the section
            diameter: Diameter
            centerX: Center X
            centerY: Center Y
            isEmpty (optional): Optional, True if figure is a hole
            material (optional): Optional, ID of the figure material
            doNotCenter (optional): Optional, avoid section centering

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/add/addcirc/'+str(sectionID)+'/'+str(diameter)+'/'+str(centerX)+'/'+str(centerY)+'/'+str(isEmpty)+'/'+str(material)+'/'+str(doNotCenter)+'', null, null));}
    async addCircSection(D) {
/*        ''' Add a new beam circular section to the model.
        
        Args:
            D: Diameter D

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/circ/'+str(D)+'', null, null));}
    async addCSection(Lz, Ly, tw, tf1, tf2, Lz2=0) {
/*        ''' Add a new beam C section to the model.
        
        Args:
            Lz: Outer base
            Ly: Outer height
            tw: Wall thickness
            tf1: Top flange thickness
            tf2: Bottom flange thickness
            Lz2 (optional): Outer bottom base, if different from top

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/cshape/'+str(Lz)+'/'+str(Ly)+'/'+str(tw)+'/'+str(tf1)+'/'+str(tf2)+'/'+str(Lz2)+'', null, null));}
    async addCustomTranslations(path) {
/*        ''' Add custom translations to the model, from a CSV file with ";"-separated entries. The file must be encoded in UTF-8
        
        Args:
            path: 

        Returns:
            
        '''*/
        return sbool(await this.nfrest('POST', '/op/trasl'+qt(path)+'', null, null));}
    async addDCSection(Lz, Ly, tw, tf1, tf2, gap, Lz2=0) {
/*        ''' Add a new beam double-C section to the model.
        
        Args:
            Lz: Outer base
            Ly: Outer height
            tw: Wall thickness
            tf1: Top flange thickness
            tf2: Bottom flange thickness
            gap: Gap between single profiles
            Lz2 (optional): Outer bottom base, if different from top

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/doublecshape/'+str(Lz)+'/'+str(Ly)+'/'+str(tw)+'/'+str(tf1)+'/'+str(tf2)+'/'+str(gap)+'/'+str(Lz2)+'', null, null));}
    async addDesignMatFromLib(name) {
/*        ''' Add a design material from library
        
        Args:
            name: 

        Returns:
            ID of the added material, 0 if not found
        '''*/
        return parseInt(await this.nfrest('POST', '/designmaterial/add/fromlib', name, null));}
    async addDesMaterial(name, E, fk, ni=0, type_=0) {
/*        ''' Add a design material from scratch. Uniaxial type is required (e.g. rebar, FRP, etc.)
        
        Args:
            name: Name of the new design material
            E: Young's modulus
            fk: Characteristic strength
            ni (optional): Optional. Poisson's ratio
            type_ (optional): Optional. Integer to set materal type for checking: 1 steel, aluminium 2, concrete 3, timber 4, masonry 5, tensionFragile 6

        Returns:
            ID of the added material
        '''*/
        return parseInt(await this.nfrest('GET', '/material/add/des/'+qt(name)+'/'+str(E)+'/'+str(fk)+'/'+str(ni)+'/'+str(type_)+'', null, null));}
    async addDLSection(Lz, Ly, tw, tf1, gap) {
/*        ''' Add a new beam double L section to the model.
        
        Args:
            Lz: Outer base
            Ly: Outer height
            tw: Wall thickness
            tf1: Bottom flange thickness
            gap: Gap between single profiles

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/doublelshape/'+str(Lz)+'/'+str(Ly)+'/'+str(tw)+'/'+str(tf1)+'/'+str(gap)+'', null, null));}
    async addDrawing(name, elems, group, plane, scaleDenom, paperX, paperY, asMember=false) {
/*        ''' Add a drawing export to the model
        
        Args:
            name: Name of the construction drawing
            elems: List of elements to be rendered. Choose a list of elements or a group
            group: Name of group to be rendered. Choose a list of elements or a group
            plane: Plane applicable only when a group is selected. "XY"=0, "XZ"=1, "YZ"=2
            scaleDenom: 
            paperX: Size of the paper in cm. It affects layout
            paperY: Size of the paper in cm. It affects layout
            asMember (optional): Option applicable only when a group is selected. If active, renders the group as a member (horizontal development)

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/model/drawing/'+qt(name)+'/'+qt(group)+'/'+str(plane)+'/'+str(scaleDenom)+'/'+str(paperX)+'/'+str(paperY)+'/'+str(asMember)+'', elems, null));}
    async addDTSection(Lz, Ly, tw, tf1, tf2, Lz2=0) {
/*        ''' Add a new beam double-T section to the model.
        
        Args:
            Lz: Outer base
            Ly: Outer height
            tw: Wall thickness
            tf1: Top flange thickness
            tf2: Bottom flange thickness
            Lz2 (optional): Outer bottom base, if different from top

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/dtshape/'+str(Lz)+'/'+str(Ly)+'/'+str(tw)+'/'+str(tf1)+'/'+str(tf2)+'/'+str(Lz2)+'', null, null));}
    async addEC8spectrum(ag, q, LS, damping=0.05, soilType='A', type1=true) {
/*        ''' Add a EC8 spectrum function from given paramters.
        
        Args:
            ag: Spectral acceleration for T=0
            q: Behaviour factor
            LS: Limit State (OLS,DLS,LLS or CLS)
            damping (optional): Damping ratio for the spectrum. Eg. 0.05
            soilType (optional): Soil category, letters A,B,C,D,E
            type1 (optional): Flag. If true, Type 1 spectrum is returned, Type 2 otherwise.

        Returns:
            The ID of the added spectral function
        '''*/
        return parseInt(await this.nfrest('GET', '/function/ec8spectrum/'+str(ag)+'/'+str(q)+'/'+qt(LS)+'/'+str(damping)+'/'+qt(soilType)+'/'+str(type1)+'', null, null));}
    async addEdgeLoad(elem, values, edge, direction, loadcase, local=false) {
/*        ''' Add a uniform or linear distributed load on the specified edge of planar element.
        
        Args:
            elem: Planar element retaining the load
            values: Array of nodal values. Use one value if constant.
            edge: Index of the edge to be loaded. It starts from 1.
            direction: Direction of the load: 1=X, 2=Y, 3=Z, 4=RX, 5=RY, 6=RZ
            loadcase: Name of the loadcase
            local (optional): Optional. True if load has been defined locally. False by default

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/load/element/edgeadd/'+qt(elem)+'/'+str(edge)+'/'+str(direction)+'/'+qt(loadcase)+'/'+str(local)+'', values, null));}
    async addFillInSection(sectionID, x, y, material=0, doNotCenter=false) {
/*        ''' Add a filled figure in an already defined beam section
        
        Args:
            sectionID: ID of the section
            x: Array of x coordinates
            y: Array of y coordinates
            material (optional): Optional, ID of the figure material
            doNotCenter (optional): Optional, avoid section centering

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/add/fill/'+str(sectionID)+'/'+str(material)+'/'+str(doNotCenter)+'', null, dict([("x",JSON.stringify(x)),("y",JSON.stringify(y))])));}
    async addFloorPlane(name, type_, n1, n2, n3, n4='') {
/*        ''' Add a floor plane load to the model
        
        Args:
            name: Name of the floor load to be used
            type_: Distribution of the floor load: 1 triangular - 2 quadrangular-centroid - 3 oriented quadrangular - 4 two-way quadrangular
            n1: 1st node
            n2: 2nd node
            n3: 3rd node
            n4 (optional): 4th node required only if quadrangular distribution is set

        Returns:
            True if successful, False if not or if nodes don't form a plane or beam elements don't cover the entire perimeter
        '''*/
        return sbool(await this.nfrest('GET', '/load/floor/planeadd/'+qt(name)+'/'+str(type_)+'/'+qt(n1)+'/'+qt(n2)+'/'+qt(n3)+'/'+qt(n4)+'', null, null));}
    async addGroup(name) {
/*        ''' Add an empty group to the model
        
        Args:
            name: 

        Returns:
            False if already existing, True otherwise
        '''*/
        return sbool(await this.nfrest('GET', '/group/add/'+qt(name)+'', null, null));}
    async addHoleInSection(sectionID, x, y, material=0, doNotCenter=false) {
/*        ''' Add and empty figure in an already defined beam section
        
        Args:
            sectionID: ID of the section
            x: Array of x coordinates
            y: Array of y coordinates
            material (optional): Optional, ID of the figure material
            doNotCenter (optional): Optional, avoid section centering

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/add/hole/'+str(sectionID)+'/'+str(material)+'/'+str(doNotCenter)+'', null, dict([("x",JSON.stringify(x)),("y",JSON.stringify(y))])));}
    async addIsoMaterial(name, E, ni, Wden, fk=0, conductivity=0, specificHeat=0, type_=0) {
/*        ''' Add an isotropic material from scratch
        
        Args:
            name: Name of the new material
            E: Young's modulus
            ni: Poisson's ratio
            Wden: Weight density
            fk (optional): Characteristic strength
            conductivity (optional): Conductivity, for thermal analysis
            specificHeat (optional): Specific heat, for thermal analysis
            type_ (optional): Optional. Integer to set materal type for checking: 1 steel, aluminium 2, concrete 3, timber 4, masonry 5, tensionFragile 6

        Returns:
            ID of the added material
        '''*/
        return parseInt(await this.nfrest('GET', '/material/add/iso/'+qt(name)+'/'+str(E)+'/'+str(ni)+'/'+str(Wden)+'/'+str(fk)+'/'+str(conductivity)+'/'+str(specificHeat)+'/'+str(type_)+'', null, null));}
    async addLayeredPlanarSection(layerThicknesses, layerMaterials) {
/*        ''' Add a new layered planar section to the model
        
        Args:
            layerThicknesses: Array of double with layer thicknesses
            layerMaterials: Array of integers with layer materials

        Returns:
            The ID assigned to the section
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/layeredplanar', null, dict([("layerThicknesses",JSON.stringify(layerThicknesses)),("layerMaterials",JSON.stringify(layerMaterials))])));}
    async addLoadCase(name) {
/*        ''' Add a loacase of a given name to the model
        
        Args:
            name: Name of the loadcase

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/add/'+qt(name)+'', null, null));}
    async addLoadCaseToCombination(name, loadcase, factor) {
/*        ''' Add a loadcase and a factor to an already existing combination, buckling or PDelta analysis
        
        Args:
            name: Name of the combination or buckling analysis
            loadcase: Name of the loadcase to add to the combination
            factor: Factor for the loadcase to add to the combination

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/combo/add/'+qt(name)+'/'+qt(loadcase)+'/'+str(factor)+'', null, null));}
    async addLoadCaseToTimeHistoryAnalysis(name, loadcase, factor, THid=-1) {
/*        ''' Add a loadcase and a factor to an already existing time-history analysis (static or dynamic)
        
        Args:
            name: Name of the existing time-history analysis
            loadcase: Name of the loadcase to add
            factor: Factor for the loadcase to add
            THid (optional): Optional. The ID of the time series to associate with load, default is -1 for ramp

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/combo/addth/'+qt(name)+'/'+qt(loadcase)+'/'+str(factor)+'/'+str(THid)+'', null, null));}
    async addLongitRebar(elem, X, Y, area, matID, Linit, Lfin, rectBase=0, strandTens=0) {
/*        ''' Add a longitudinal rebar to a member (beam, column or wall)
        
        Args:
            elem: ID of the element
            X: X coordinate in transversal section
            Y: Y coordinate in transversal section
            area: Area of the rebar
            matID: ID of the associated design material
            Linit: Initial abscissa from 0 to 1
            Lfin: Final abscissa from 0 to 1
            rectBase (optional): Optional. Rectangular width if layer is added instead of bar
            strandTens (optional): Optional. Tension for strand

        Returns:
            True is successful
        '''*/
        return sbool(await this.nfrest('GET', '/element/rebar/long/'+qt(elem)+'/'+str(X)+'/'+str(Y)+'/'+str(area)+'/'+str(matID)+'/'+str(Linit)+'/'+str(Lfin)+'/'+str(rectBase)+'/'+str(strandTens)+'', null, null));}
    async addLongitRebarInSection(sectionID, X, Y, area, matID, rectBase=0, strandTens=0) {
/*        ''' Add a longitudinal bar to a section
        
        Args:
            sectionID: ID of the section
            X: X coordinate in transversal section
            Y: Y coordinate in transversal section
            area: Area of the rebar
            matID: ID of the associated design material
            rectBase (optional): Optional. Rectangular width if layer is added instead of bar
            strandTens (optional): Optional. Tension for strand

        Returns:
            Bar is added if area is bigger of the eventual bar in the same position. To avoid this, clear rebar prior to use this command
        '''*/
        return sbool(await this.nfrest('GET', '/section/rebar/long/'+qt(sectionID)+'/'+str(X)+'/'+str(Y)+'/'+str(area)+'/'+str(matID)+'/'+str(rectBase)+'/'+str(strandTens)+'', null, null));}
    async addLongitRebarInSection(sectionID, X, Y, area, matID, rectBase=0, strandTens=0) {
/*        ''' Add a longitudinal bar to a section
        
        Args:
            sectionID: ID of the section
            X: X coordinate in transversal section
            Y: Y coordinate in transversal section
            area: Area of the rebar
            matID: ID of the associated design material
            rectBase (optional): Optional. Rectangular width if layer is added instead of bar
            strandTens (optional): Optional. Tension for strand

        Returns:
            Bar is added if area is bigger of the eventual bar in the same position. To avoid this, clear rebar prior to use this command
        '''*/
        return sbool(await this.nfrest('GET', '/section/rebar/long/'+str(sectionID)+'/'+str(X)+'/'+str(Y)+'/'+str(area)+'/'+str(matID)+'/'+str(rectBase)+'/'+str(strandTens)+'', null, null));}
    async addLSection(Lz, Ly, tw, tf1) {
/*        ''' Add a new beam L section to the model.
        
        Args:
            Lz: Outer base
            Ly: Outer height
            tw: Wall thickness
            tf1: Bottom flange thickness

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/lshape/'+str(Lz)+'/'+str(Ly)+'/'+str(tw)+'/'+str(tf1)+'', null, null));}
    async addMatFromLib(name) {
/*        ''' Add a material from library
        
        Args:
            name: 

        Returns:
            ID of the added material, 0 if not found
        '''*/
        return parseInt(await this.nfrest('POST', '/material/add/fromlib', name, null));}
    async addMember(elems) {
/*        ''' Add a member in the model
        
        Args:
            elems: Array of beam IDs to be added. The first entry will be the member name

        Returns:
            True if successful, False otherwise. Beams are ordered
        '''*/
        return sbool(await this.nfrest('GET', '/model/member/add', null, dict([("elems",JSON.stringify(elems))])));}
    async addMeshedWall(ID, origX, origY, origZ, div1, div2, plan, leng, hei, angle=0, tilt='0', nodeOffset=10000, isHorizontal=false) {
/*        ''' Add a wall to the model meshed with quad elements
        
        Args:
            ID: ID of the wall
            origX: X origin coordinate
            origY: Y origin coordinate
            origZ: Z origin coordinate
            div1: Number of division along 1st direction
            div2: Number of division along 2st direction
            plan: Plane of the wall, use "XY", "XZ" or "YZ"
            leng: Lenght of the wall
            hei: Height of the wall
            angle (optional): Optional. Angle with respect to the normal of XY plane, or angle with respect to the horizontal for YZ and YZ planes
            tilt (optional): Optional, default "0". Use "x" or "y" for YZ and YZ planes
            nodeOffset (optional): Optional, default 10000. Offset for node numbering
            isHorizontal (optional): Set to true to create vertical section cuts. If omitted or set to false, vertical wall is assumed.

        Returns:
            A list of nodes for the wall
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/addmeshedwall/'+str(ID)+'/'+str(origX)+'/'+str(origY)+'/'+str(origZ)+'/'+str(div1)+'/'+str(div2)+'/'+qt(plan)+'/'+str(leng)+'/'+str(hei)+'/'+str(angle)+'/'+qt(tilt)+'/'+str(nodeOffset)+'/'+str(isHorizontal)+'', null, null));}
    async addNodalDisp(node, disp, direction, loadcase) {
/*        ''' Add an imposed displacement to the selected node
        
        Args:
            node: Node retaining the load
            disp: Imposed displacement value
            direction: Direction of the load: 1=X, 2=Y, 3=Z, 4=RX, 5=RY, 6=RZ
            loadcase: Name of the loadcase

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/node/disp/'+qt(node)+'/'+str(disp)+'/'+str(direction)+'/'+qt(loadcase)+'', null, null));}
    async addNodalLoad(node, value, direction, loadcase, local=false) {
/*        ''' Add a nodal load to the model
        
        Args:
            node: Node retaining the load
            value: Load value
            direction: Direction of the load: 1=X, 2=Y, 3=Z, 4=RX, 5=RY, 6=RZ
            loadcase: Name of the loadcase
            local (optional): True if load has been defined locally

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/node/add/'+qt(node)+'/'+str(value)+'/'+str(direction)+'/'+qt(loadcase)+'/'+str(local)+'', null, null));}
    async addNodalMass(ID, tmx, tmy, tmz, rmx, rmy, rmz) {
/*        ''' Add a nodal mass
        
        Args:
            ID: ID of the node hosting the mass
            tmx: Translational mass in X
            tmy: Translational mass in Y
            tmz: Translational mass in Z
            rmx: Rotational inertia around X
            rmy: Rotational inertia around Y
            rmz: Rotational inertia around Z

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/mass/add/'+qt(ID)+'/'+str(tmx)+'/'+str(tmy)+'/'+str(tmz)+'/'+str(rmx)+'/'+str(rmy)+'/'+str(rmz)+'', null, null));}
    async addNodalSpring(n1, propName) {
/*        ''' Add a spring connected to the ground. Existing results will be deleted.
        
        Args:
            n1: Selected node
            propName: Name of the property of the spring

        Returns:
            The ID of the added elem
        '''*/
        return await this.nfrest('GET', '/element/add/nodalspring/'+qt(n1)+'/'+qt(propName)+'', null, null);}
    async addNode(x, y, z, lcs1X=0, lcs1Y=0, lcs1Z=0, lcs2X=0, lcs2Y=0, lcs2Z=0) {
/*        ''' Add a new node to the model. Existing results will be deleted.
        
        Args:
            x: X coordinate
            y: Y coordinate
            z: Z coordinate
            lcs1X (optional): 1st vector of nodal local axis: component x
            lcs1Y (optional): 1st vector of nodal local axis: component y
            lcs1Z (optional): 1st vector of nodal local axis: component z
            lcs2X (optional): 2nd vector of nodal local axis: component x
            lcs2Y (optional): 2nd vector of nodal local axis: component y
            lcs2Z (optional): 2nd vector of nodal local axis: component z

        Returns:
            The ID of the added node, empty string in case of error
        '''*/
        return await this.nfrest('GET', '/node/add/'+str(x)+'/'+str(y)+'/'+str(z)+'/'+str(lcs1X)+'/'+str(lcs1Y)+'/'+str(lcs1Z)+'/'+str(lcs2X)+'/'+str(lcs2Y)+'/'+str(lcs2Z)+'', null, null);}
    async addNodeWithID(x, y, z, ID) {
/*        ''' Add a new node with ID
        
        Args:
            x: X coordinate
            y: Y coordinate
            z: Z coordinate
            ID: ID of the node to be added to the model

        Returns:
            True if successful, False if node is already existing
        '''*/
        return sbool(await this.nfrest('GET', '/node/add/'+str(x)+'/'+str(y)+'/'+str(z)+'/'+qt(ID)+'', null, null));}
    async addNormalhinge(name, checkType, position, includeShear=false, includeTorsion=false, cKpl=0.001, FresRatio=0.2) {
/*        ''' Add a beam hinge without NVM interaction, ready to be assigned to elements. To be used typically for beams in rigid floors
        
        Args:
            name: Name of the hinge
            checkType: Name of the check to be applied - use "Concrete_EC" or "Concrete_NTC" for concrete beams, "Steel_Hinge_EC3" for steel, "Aluminium_Hinge_EC9" for aluminium alloy, or national/custom rules
            position: Position in percentage of beam length (0 or 100)
            includeShear (optional): True to include shear DoFs
            includeTorsion (optional): True to include torsion as hinge DoF
            cKpl (optional): Ratio for plastic branch stiffness over elastic stiffness
            FresRatio (optional): Residual force after failure, ratio with yielding

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/hinge/add/simple/'+qt(name)+'/'+qt(checkType)+'/'+str(position)+'/'+str(includeShear)+'/'+str(includeTorsion)+'/'+str(cKpl)+'/'+str(FresRatio)+'', null, null));}
    async addNTCspectrum(lat, lon, LS, soil, Vr, St, hh=1, q0=1, isHregular=false, damping=0.05, customAg=0, VerticalComponent=false) {
/*        ''' Add a NTC 2018 spectrum from given parameters.
        
        Args:
            lat: Latitude in WGS84. Location must be in Italy.
            lon: Longitude in WGS84. Location must be in Italy.
            LS: Limit State for spectrum: SLO, SLD, SLV or SLC
            soil: Soil category, letters A,B,C,D,E
            Vr: Reference life as per NTC 2018, in years
            St: Topographic coefficient for the site
            hh (optional): h/H ratio of building site, maximum is 1
            q0 (optional): Behaviour factor, default is 1.0 (elastic spectrum)
            isHregular (optional): True for regular shaped buildings over height
            damping (optional): Damping ratio for the spectrum. Eg. 0.05
            customAg (optional): Optional. Spectral acceleration for T=0
            VerticalComponent (optional): True if spectrum is for vertical component. Deafult is false.

        Returns:
            The ID of the added spectral function
        '''*/
        return parseInt(await this.nfrest('GET', '/function/ntcspectrum/'+str(lat)+'/'+str(lon)+'/'+qt(LS)+'/'+qt(soil)+'/'+str(Vr)+'/'+str(St)+'/'+str(hh)+'/'+str(q0)+'/'+str(isHregular)+'/'+str(damping)+'/'+str(customAg)+'/'+str(VerticalComponent)+'', null, null));}
    async addNVMhinge(name, checkType, position, includeShear=false, includeTorsion=false, cKpl=0.001, FresRatio=0.2, stopResidualBranch=false) {
/*        ''' Add a beam hinge with NVM interaction, ready to be assigned to elements. Typically, this is the hinge for columns.
        
        Args:
            name: Name of the hinge
            checkType: Name of the check to be applied - use "Concrete_EC" or "Concrete_NTC" for concrete beams, "Steel_Hinge_EC3" for steel, "Aluminium_Hinge_EC9" for aluminium alloy, or national/custom rules
            position: Position in percentage of beam length (0 or 100)
            includeShear (optional): True to include shear as interaction DoFs
            includeTorsion (optional): True to include torsion as hinge DoF
            cKpl (optional): Ratio for plastic branch stiffness over elastic stiffness
            FresRatio (optional): Residual force after failure, ratio with yielding
            stopResidualBranch (optional): Optional, default is false. If true, hinge exhibits a residual branch with its own ultimate deformation

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/hinge/add/nvm/'+qt(name)+'/'+qt(checkType)+'/'+str(position)+'/'+str(includeShear)+'/'+str(includeTorsion)+'/'+str(cKpl)+'/'+str(FresRatio)+'/'+str(stopResidualBranch)+'', null, null));}
    async addObject(o, other=0) {
/*        ''' Directly add object to model
        
        Args:
            o: Object to be added
            other (optional): Flag to distinguish object types

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/model/addobject/'+str(other)+'', o, null));}
    async addOmegaSection(Lz, Ly, tw, d) {
/*        ''' Add a new beam omega or cold-formed C section to the model.
        
        Args:
            Lz: Inner base
            Ly: Outer height
            tw: Wall thickness
            d: Outer flange length

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/omega/'+str(Lz)+'/'+str(Ly)+'/'+str(tw)+'/'+str(d)+'', null, null));}
    async addOrChangeDesMaterialProperty(ID, name, value, units='') {
/*        ''' Add or modify a custom property of the selected design material
        
        Args:
            ID: ID of the design material
            name: Name of the property
            value: Value of the property as string. Value must use . as decimal separator
            units (optional): Optional. Units of measure for property value

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/designmaterial/prop/'+str(ID)+'/'+qt(name)+'/'+qt(value)+'/'+qt(units)+'', null, null));}
    async addOrChangeElementFlag(ID, flag, value) {
/*        ''' Add or change a flag for the element. Flags are custom properties that can be used for any purpose (see elementAvailableFlags)
        
        Args:
            ID: ID of the element
            flag: Name of the flag
            value: Value of the flag

        Returns:
            True if the flag was added or updated successfully
        '''*/
        return sbool(await this.nfrest('', ''+qt(ID)+'/'+qt(flag)+'/'+qt(value)+'', null, null));}
    async addOrChangeLoadCombinationsTable(table) {
/*        ''' Add or change the load combinations table set in the model. Function needs General Design license.
        
        Args:
            table

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/loadcases/combostable', table, null));}
    async addOrChangeMaterialProperty(ID, name, value, units='') {
/*        ''' Add or modify a custom property of the selected material
        
        Args:
            ID: ID of the material
            name: Name of the property
            value: Value of the property as a string (including name, code, etc.). Value must use . as decimal separator
            units (optional): Optional. Units of measure for property value

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/material/prop/'+str(ID)+'/'+qt(name)+'/'+qt(value)+'/'+qt(units)+'', null, null));}
    async addOrModifyCustomData(key, value) {
/*        ''' Add a data field into the model
        
        Args:
            key: Key, must be unique
            value: Value to store, in string format, or object already serialize in JSON

        Returns:
            True
        '''*/
        return sbool(await this.nfrest('POST', '/model/customdata/'+qt(key)+'', value, null));}
    async addPipeSection(D, t) {
/*        ''' Add a new beam pipe section to the model.
        
        Args:
            D: Outer diameter D
            t: Thickness t

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/pipe/'+str(D)+'/'+str(t)+'', null, null));}
    async addPlanarSection(t) {
/*        ''' Add a new planar section to the model
        
        Args:
            t: Thickness

        Returns:
            The ID assigned to the section
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/planar/'+str(t)+'', null, null));}
    async addQuad(n1, n2, n3, n4, sect=0, mat=0) {
/*        ''' Add a quad planar element to the model
        
        Args:
            n1: Connected node 1
            n2: Connected node 2
            n3: Connected node 3
            n4: Connected node 4
            sect (optional): Optional section ID
            mat (optional): Optional material ID

        Returns:
            The ID of the added elem
        '''*/
        return await this.nfrest('GET', '/element/add/quad/'+qt(n1)+'/'+qt(n2)+'/'+qt(n3)+'/'+qt(n4)+'/'+str(sect)+'/'+str(mat)+'', null, null);}
    async addQuadWithID(n1, n2, n3, n4, ID, sect=0, mat=0) {
/*        ''' Add a quad planar element to the model with the desired ID
        
        Args:
            n1: Connected node 1
            n2: Connected node 2
            n3: Connected node 3
            n4: Connected node 4
            ID: Element ID
            sect (optional): Optional section ID
            mat (optional): Optional material ID

        Returns:
            The ID of the added elem
        '''*/
        return sbool(await this.nfrest('GET', '/element/add/quadwithid/'+qt(n1)+'/'+qt(n2)+'/'+qt(n3)+'/'+qt(n4)+'/'+qt(ID)+'/'+str(sect)+'/'+str(mat)+'', null, null));}
    async addRebarPattern(elem, pattern, Linit, Lfin, numBars, rebCover, matID, area, netSpacing=0) {
/*        ''' Adds rebars by pattern in the selected element.
        
        Args:
            elem: ID of the element
            pattern: Top=0, Bottom=1, Equal spacing=2, Wall=3, Lateral=4, Left=5, Right=6, Intermediate=7
            Linit: Initial abscissa in percentage of length
            Lfin: Final abscissa in percentage of length
            numBars: Number of bars to be placed
            rebCover: Rebar cover from the centre of the first bar to the border of the section. It applies in both directions
            matID: ID of the associated design material
            area: Area of each single rebar rebar
            netSpacing (optional): Spacing of net in walls. Effective only if pattern is 3.

        Returns:
            True is successful
        '''*/
        return sbool(await this.nfrest('GET', '/element/rebar/pattern/'+qt(elem)+'/'+str(pattern)+'/'+str(Linit)+'/'+str(Lfin)+'/'+str(numBars)+'/'+str(rebCover)+'/'+str(matID)+'/'+str(area)+'/'+str(netSpacing)+'', null, null));}
    async addRebarPatternInSection(pattern, sectionID, numBars, rebCover, matID, area, netSpacing=0) {
/*        ''' Adds rebars by pattern in the selected section.
        
        Args:
            pattern: Top=0, Bottom=1, Equal spacing=2, Wall=3, Lateral=4, Left=5, Right=6
            sectionID: ID of the section
            numBars: Number of bars to be placed
            rebCover: Rebar cover from the centre of the first bar to the border of the section. It applies in both directions
            matID: ID of the associated design material
            area: Area of each single rebar rebar
            netSpacing (optional): Spacing of net in walls. Effective only if pattern is 3.

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/section/rebar/pattern/'+str(pattern)+'/'+str(sectionID)+'/'+str(numBars)+'/'+str(rebCover)+'/'+str(matID)+'/'+str(area)+'/'+str(netSpacing)+'', null, null));}
    async addRebarRowInSection(sectionID, numBars, latCover, hei, matID, Dmm, rebarPreStress=0) {
/*        ''' Add a rebar layer at a specified height of the section
        
        Args:
            sectionID: ID of the section
            numBars: Number of bars to be placed
            latCover: Rebar cover from the centre of the first bar to the lateral side of the section
            hei: Height of the rebar layer, from the bottom of the section
            matID: ID of the associated design material
            Dmm: Diameter of bars in mm
            rebarPreStress (optional): 0 for steel rebar, otherwise prestress is specified

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/rebar/row/'+str(sectionID)+'/'+str(numBars)+'/'+str(latCover)+'/'+str(hei)+'/'+str(matID)+'/'+str(Dmm)+'/'+str(rebarPreStress)+'', null, null));}
    async addRectangleInSection(sectionID, b, h, centerX, centerY, isEmpty=false, material=0, doNotCenter=false) {
/*        ''' Add a rectangular figure in the selected section
        
        Args:
            sectionID: ID of the section
            b: Base
            h: Height
            centerX: Center X
            centerY: Center Y
            isEmpty (optional): Optional, True if figure is a hole
            material (optional): Optional, ID of the figure material
            doNotCenter (optional): Optional, avoid section centering

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/add/addrect/'+str(sectionID)+'/'+str(b)+'/'+str(h)+'/'+str(centerX)+'/'+str(centerY)+'/'+str(isEmpty)+'/'+str(material)+'/'+str(doNotCenter)+'', null, null));}
    async addRectSection(Lz, Ly) {
/*        ''' Add a new beam rectangular section to the model.
        
        Args:
            Lz: Base Lz
            Ly: Height Ly

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/rect/'+str(Lz)+'/'+str(Ly)+'', null, null));}
    async addSectFromLib(name) {
/*        ''' Add a section from library
        
        Args:
            name: Name of the section

        Returns:
            ID of the added section, 0 if not found
        '''*/
        return parseInt(await this.nfrest('POST', '/section/add/fromlib', name, null));}
    async addSectFromLib(name, doNotCenter=false) {
/*        ''' Add a section from library
        
        Args:
            name: Name of the section
            doNotCenter (optional): Optional. Do not center the section, useful for sections by points

        Returns:
            ID of the added section, 0 if not found
        '''*/
        return parseInt(await this.nfrest('POST', '/section/add/fromlib/'+str(doNotCenter)+'', name, null));}
    async addSectionByPoints(x, y, CF_tw=0, CF_rc=0, material=0, doNotCenter=false) {
/*        ''' Add a section by points. x() and y() are the 1st series of points (filled figure). If a cold-formed section is added, specify optional parameters.
        
        Args:
            x: Array of x coordinates
            y: Array of y coordinates
            CF_tw (optional): Optional, thickness of a cold-formed section
            CF_rc (optional): Optional, radius of curvature of a cold-formed section
            material (optional): Optional, ID of the section material
            doNotCenter (optional): Optional, avoid section centering

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/bypoints/'+str(CF_tw)+'/'+str(CF_rc)+'/'+str(material)+'/'+str(doNotCenter)+'', null, dict([("x",JSON.stringify(x)),("y",JSON.stringify(y))])));}
    async addSectionCover(sectionID, coverMat, coverThickness) {
/*        ''' Add a section cover, e.g. for fire checking purposes
        
        Args:
            sectionID: ID of the original section
            coverMat: ID of the material for the cover layer
            coverThickness: Thickness of the cover layer

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/add/cover/'+str(sectionID)+'/'+str(coverMat)+'/'+str(coverThickness)+'', null, null));}
    async addSectionFromDXF(path, CF_tw=0, CF_rc=0, material=0) {
/*        ''' Add a section from a DXF file containing polylines. If a cold-formed section is added, specify optional parameters.
        
        Args:
            path: Full path of DXF file
            CF_tw (optional): Optional, thickness of a cold-formed section
            CF_rc (optional): Optional, radius of curvature of a cold-formed section
            material (optional): Optional, ID of the section material

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/fromdxf/'+str(CF_tw)+'/'+str(CF_rc)+'/'+str(material)+'', null, dict([("path",path)])));}
    async addSeriesFunction(Xlist, Ylist, type_, units='') {
/*        ''' Add a time series function to the model
        
        Args:
            Xlist: Array of times/periods
            Ylist: Array of values, same size of Xlist
            type_: 0 displacement TH, 1 velocity TH, 2 acceleration TH, 3 acceleration spectrum, 4 displacement spectrum
            units (optional): Units of measure for data in ordinate (Y)

        Returns:
            The ID of the time series, -1 in case of errors
        '''*/
        return parseInt(await this.nfrest('GET', '/function/add/'+str(type_)+'', null, dict([("x",JSON.stringify(Xlist)),("y",JSON.stringify(Ylist)),("units",units)])));}
    async addSineFunction(frequency, phase, stp, duration, maxAmplitude, isGrowing=false, type_=0, units='') {
/*        ''' Add a sine function to the model. It can be growing or not.
        
        Args:
            frequency: Frequency of sine function, in Hz
            phase: Phase angle, in radians
            stp: Number of step per cycle
            duration: Duration of the function
            maxAmplitude: Amplitude of the function
            isGrowing (optional): Optional: True if growing sine function. Default: false.
            type_ (optional): Optional: 0 displacement TH, 1 velocity TH, 2 acceleration TH, 3 acceleration spectrum, 4 displacement spectrum
            units (optional): Optional: Units of measure for data in ordinate (Y)

        Returns:
            The ID of the time series
        '''*/
        return parseInt(await this.nfrest('GET', '/function/sine/'+str(frequency)+'/'+str(phase)+'/'+str(stp)+'/'+str(duration)+'/'+str(maxAmplitude)+'/'+str(isGrowing)+'/'+str(type_)+'', null, dict([("units",units)])));}
    async addSolid(nodes, mat=0) {
/*        ''' Add a solid element to the model. Element type is set on the size of the number of nodes
        
        Args:
            nodes: Array of nodes. 4 for tetra, 6 for wedge, 8 for hexa, 10 for tetra10, 15 for wedge15, 20 for hexa20.
            mat (optional): Optional material ID

        Returns:
            The ID of the added elem
        '''*/
        return await this.nfrest('GET', '/element/add/solid/'+str(mat)+'', null, dict([("nodes",JSON.stringify(nodes))]));}
    async addSpring(n1, n2, propName) {
/*        ''' Add a new 2-node spring to the model. Existing results will be deleted.
        
        Args:
            n1: First node ID
            n2: Second node ID
            propName: Name of the property of the spring

        Returns:
            The ID of the added elem
        '''*/
        return await this.nfrest('GET', '/element/add/spring/'+qt(n1)+'/'+qt(n2)+'/'+qt(propName)+'', null, null);}
    async addSpringNLProperty(name, NLdofs, NLprops, local=false) {
/*        ''' Add a non-linear spring property to the model
        
        Args:
            name: Name of the property, must be unique
            NLdofs: Array of integers from 0 to 15 to associate a non-linear behaviour to each DoF. Use -1 to leave the DoF inactive
            NLprops: Array containing 6 arrays of numerical properties for the each selected non-linear behaviour
            local (optional): True if properties are referred to local axes of the spring element

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/springproperty/nl/add/'+qt(name)+'/'+JSON.stringify(NLdofs)+'/'+str(local)+'', NLprops, null));}
    async addSpringProperty(name, Kx, Ky, Kz, Krx, Kry, Krz, local=false) {
/*        ''' Add a spring property to the model
        
        Args:
            name: Name of the property, must be unique
            Kx: Stiffness in X direction
            Ky: Stiffness in Y direction
            Kz: Stiffness in Z direction
            Krx: Stiffness in RX direction
            Kry: Stiffness in RY direction
            Krz: Stiffness in RZ direction
            local (optional): True if properties are referred to local axes of the spring element

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/springproperty/simple/add/'+qt(name)+'/'+str(Kx)+'/'+str(Ky)+'/'+str(Kz)+'/'+str(Krx)+'/'+str(Kry)+'/'+str(Krz)+'/'+str(local)+'', null, null));}
    async addSpringsOnOverlappedNodes(n, propName) {
/*        ''' Add springs on selected overlapped nodes.
        
        Args:
            n: Array of nodes
            propName: Name of the property of the springs

        Returns:
            
        '''*/
        return des(await this.nfrest('POST', '/element/add/springsonnodes/'+qt(propName)+'', n, null));}
    async addSpringWithID(n1, n2, ID, propName) {
/*        ''' Add a new 2-node spring to the model with the desired ID. Existing results will be deleted.
        
        Args:
            n1: First node ID
            n2: Second node ID
            ID: Element ID
            propName: Name of the property of the spring

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/element/add/springwithid/'+qt(n1)+'/'+qt(n2)+'/'+qt(ID)+'/'+qt(propName)+'', null, null));}
    async addStirrupBars(elem, LnumY, LnumZ, area, spacing, matID, Linit, Lfin) {
/*        ''' Add stirrup bars to a member (beam, column or wall)
        
        Args:
            elem: ID of the element
            LnumY: Legs in Y dir.
            LnumZ: Legs in Z dir.
            area: Area of the rebar
            spacing: Stirrups spacing
            matID: ID of the associated design material
            Linit: Initial abscissa from 0 to 1
            Lfin: Final abscissa from 0 to 1

        Returns:
            True is successful
        '''*/
        return sbool(await this.nfrest('GET', '/element/rebar/stirrup/'+qt(elem)+'/'+str(LnumY)+'/'+str(LnumZ)+'/'+str(area)+'/'+str(spacing)+'/'+str(matID)+'/'+str(Linit)+'/'+str(Lfin)+'', null, null));}
    async addStirrupBarsInSection(sectionID, LnumY, LnumZ, area, spacing, matID) {
/*        ''' Add stirrup bars to a section
        
        Args:
            sectionID: ID of the section
            LnumY: Legs in Y dir.
            LnumZ: Legs in Z dir.
            area: Area of the rebar
            spacing: Stirrups spacing
            matID: ID of the associated design material

        Returns:
            True is successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/rebar/stirrup/'+str(sectionID)+'/'+str(LnumY)+'/'+str(LnumZ)+'/'+str(area)+'/'+str(spacing)+'/'+str(matID)+'', null, null));}
    async addSubsoilNodalSpringsOnElements(n, propName) {
/*        ''' Add nodal subsoil springs in nodes of chosen planar elements.
        
        Args:
            n: Array of planar element IDs
            propName: Name of the property of the springs

        Returns:
            True if successful, False if the reference property is defined in local coordinates
        '''*/
        return sbool(await this.nfrest('POST', '/element/add/soilsprings/'+qt(propName)+'', n, null));}
    async addSubsoilZProperty(width, Rmodulus) {
/*        ''' Add a subsoil distributed spring in Z direction of the model
        
        Args:
            width: Width of the bottom side of element
            Rmodulus: Reaction modulus

        Returns:
            The name of the property added, empty string in case of error
        '''*/
        return await this.nfrest('GET', '/springproperty/subsoil/add/'+str(width)+'/'+str(Rmodulus)+'', null, null);}
    async addSurfaceLoad(elem, values, direction, loadcase, local=false) {
/*        ''' Add a uniformly distributed or bi-linear load on the specified face of planar element.
        
        Args:
            elem: Planar element retaining the load
            values: Array of nodal values. Use one value if constant.
            direction: Direction of the load: 1=X, 2=Y, 3=Z, 4=RX, 5=RY, 6=RZ
            loadcase: Name of the loadcase
            local (optional): Optional. True if load has been defined locally. False by default

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/load/element/surfaceadd/'+qt(elem)+'/'+str(direction)+'/'+qt(loadcase)+'/'+str(local)+'', values, null));}
    async addThermalDistLoad(elem, values, loadcase) {
/*        ''' Add thermal loads for strain-only loading in beams and shells
        
        Args:
            elem: ID of the element
            values: Array of double of length 3: 0 = uniform temperature, 1 = gradient in local z, 2 = gradient in local y
            loadcase: Name of the loadcase

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/load/element/tempdistadd/'+qt(elem)+'/'+qt(loadcase)+'', values, null));}
    async addTria(n1, n2, n3, sect=0, mat=0) {
/*        ''' Add a tria planar element to the model
        
        Args:
            n1: Connected node 1
            n2: Connected node 2
            n3: Connected node 3
            sect (optional): Optional section ID
            mat (optional): Optional material ID

        Returns:
            The ID of the added elem
        '''*/
        return await this.nfrest('GET', '/element/add/tria/'+qt(n1)+'/'+qt(n2)+'/'+qt(n3)+'/'+str(sect)+'/'+str(mat)+'', null, null);}
    async addTriaWithID(n1, n2, n3, ID, sect=0, mat=0) {
/*        ''' Add a tria planar element to the model with the desired ID
        
        Args:
            n1: Connected node 1
            n2: Connected node 2
            n3: Connected node 3
            ID: Element ID
            sect (optional): Optional section ID
            mat (optional): Optional material ID

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/element/add/triawithid/'+qt(n1)+'/'+qt(n2)+'/'+qt(n3)+'/'+qt(ID)+'/'+str(sect)+'/'+str(mat)+'', null, null));}
    async addTruss(n1, n2, sect=0, mat=0) {
/*        ''' Add a new truss to the model. Existing results will be deleted.
        
        Args:
            n1: First node ID
            n2: Second node ID
            sect (optional): Optional section ID
            mat (optional): Optional material ID

        Returns:
            The ID of the added elem
        '''*/
        return await this.nfrest('GET', '/element/add/truss/'+qt(n1)+'/'+qt(n2)+'/'+str(sect)+'/'+str(mat)+'', null, null);}
    async addTrussWithID(n1, n2, ID, sect=0, mat=0) {
/*        ''' Add a new truss to the model with the desired ID. Existing results will be deleted.
        
        Args:
            n1: First node ID
            n2: Second node ID
            ID: Element ID
            sect (optional): Optional section ID
            mat (optional): Optional material ID

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/element/add/trusswithid/'+qt(n1)+'/'+qt(n2)+'/'+qt(ID)+'/'+str(sect)+'/'+str(mat)+'', null, null));}
    async addTSection(Lz, Ly, tw, tf1) {
/*        ''' Add a new beam T section to the model.
        
        Args:
            Lz: Outer base
            Ly: Outer height
            tw: Wall thickness
            tf1: Top flange thickness

        Returns:
            The ID assigned to the section.
        '''*/
        return parseInt(await this.nfrest('GET', '/section/add/tshape/'+str(Lz)+'/'+str(Ly)+'/'+str(tw)+'/'+str(tf1)+'', null, null));}
    async addVolumeLoad(elem, value, direction, loadcase) {
/*        ''' Add volume loading for solids
        
        Args:
            elem: Selected solid element
            value: Value
            direction: Direction of load
            loadcase: Name of the loadcase

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/element/volumeadd/'+qt(elem)+'/'+str(value)+'/'+str(direction)+'/'+qt(loadcase)+'', null, null));}
    async alignShellXaxis(num, x, y, z) {
/*        ''' Align the x local axis of the selected shell element to the given vector
        
        Args:
            num: Number of the element
            x: x component of 1st local axis
            y: y component of 1st local axis
            z: z component of 1st local axis

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/element/shellxaxis/'+qt(num)+'/'+str(x)+'/'+str(y)+'/'+str(z)+'', null, null));}
    async AnalyzeFireElement(elem, endTime, beamExposure=2, columnExposure=3, checkCombo='', selectForcesCrit=2, fireCurve=0, outOfProc=false, noWindow=false, customFireCurve=0) {
/*        ''' Write and run a new model for non-linear thermal analysis of an element section.
        
        Args:
            elem: ID of the element
            endTime: Final time in minutes (e.g. 90)
            beamExposure (optional): Beam edges exposed to fire: 0 bottom, 1 lateral edges, 2 lateral edges+bottom, 3 all edges, 4 bottom+left, 5 bottom+right
            columnExposure (optional): Column edges exposed to fire: 0 single edge, 1 two edges, 2 three edges, 3 all edges
            checkCombo (optional): Optional. Input a loadcase name to check section against its forces
            selectForcesCrit (optional): Criterion for selecting forces in section: 0 max My, - 1 max Mz - 2 max for both My and Mz
            fireCurve (optional): Optional. Fire curve: 0 ISO 834, 1 external, 2 hydrocarbon
            outOfProc (optional): If true, run the model out of process
            noWindow (optional): If true, hide the solver window or its output lines from console. Applicable only if out of process is active
            customFireCurve (optional): Optional, ID of the custom fire curve to be used

        Returns:
            The path of the newly created model or, if checking is required, an array containing "Element-Station", "N", "Vy", "Vz", "Myy", "Mzz", "Ratio-NMM", "Ratio-V", path
        '''*/
        return des(await this.nfrest('GET', '/res/check/analyzefire/'+qt(elem)+'/'+str(endTime)+'/'+str(beamExposure)+'/'+str(columnExposure)+'/'+qt(checkCombo)+'/'+str(selectForcesCrit)+'/'+str(fireCurve)+'/'+str(outOfProc)+'/'+str(noWindow)+'/'+str(customFireCurve)+'', null, null));}
    async appendDocXformula(formula, alignment=0) {
/*        ''' Append and render a formula in Ascii syntax to an already opened DocX document. By default, this is aligned to center.
        
        Args:
            formula: Ascii formula text
            alignment (optional): Optional, default is 1. 0=left, 1=center, 2=right, 3=justified

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('POST', '/op/docx/appendformula/'+str(alignment)+'', formula, null));}
    async appendDocXimage(imagePath, ratio=1, alignment=0) {
/*        ''' Append image to an already opened DocX document. By default, this is aligned to center.
        
        Args:
            imagePath: Path of the picture
            ratio (optional): Size ratio of the picture
            alignment (optional): Optional, default is 1. 0=left, 1=center, 2=right, 3=justified

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/docx/appendimage/'+str(ratio)+'/'+str(alignment)+'', null, dict([("path",imagePath)])));}
    async appendDocXimageB(image, ratio=1, alignment=0) {
/*        ''' Append image, in PNG bytes, to an already opened DocX document. By default, this is aligned to center.
        
        Args:
            image: Image bytes as string in Base64
            ratio (optional): Size ratio of the picture
            alignment (optional): Optional, default is 1. 0=left, 1=center, 2=right, 3=justified

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('POST', '/op/docx/appendimageb/'+str(ratio)+'/'+str(alignment)+'', image, null));}
    async appendDocXtext(text, alignment=0, color=0, bold=false, italic=false, underline=false) {
/*        ''' Append text to an already opened DocX document
        
        Args:
            text: 
            alignment (optional): Optional, default is 0. 0=left, 1=center, 2=right, 3=justified
            color (optional): Optional, default is 0. RGB integer value for color
            bold (optional): Optional, default is false. True for bold
            italic (optional): Optional, default is false. True for italic
            underline (optional): Optional, default is false. True for underlined text

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/op/docx/appendtext/'+str(alignment)+'/'+str(color)+'/'+str(bold)+'/'+str(italic)+'/'+str(underline)+'', text, null));}
    async applyButterworthFilter(values, samplingF, cutF, order, lowPass) {
/*        ''' Apply Butterworth filter to the 2-columns input data
        
        Args:
            values: 2-columns input data (eg. time vs. displacements)
            samplingF: Sampling frequency
            cutF: Cut-off frequency
            order: Order of the filter, an even number greater or equal to 2
            lowPass: True if low-pass, false if high-pass

        Returns:
            Array of double
        '''*/
        return des(await this.nfrest('POST', '/op/bwfilter/'+str(samplingF)+'/'+str(cutF)+'/'+str(order)+'/'+str(lowPass)+'', values, null));}
    async applyEC8lateralForces(thID, loadCaseX, loadCaseY, propMasses=false, T1=0, ct=0.05, lam=1) {
/*        ''' Apply lateral forces to the master nodes of the model. Rigid diaphragms and masses are required.
        
        Args:
            thID: ID of the spectrum function to be used as reference for total base shear
            loadCaseX: Loadcase name in X dir. in which lateral forces are stored.
            loadCaseY: Loadcase name in Y dir. in which lateral forces are stored.
            propMasses (optional): Flag (true or false). If true lateral forces follow height distribution, if false lateral forces are proportional to floor masses.
            T1 (optional): Fundamental period of the structure. If not estimated (0), specify ct and lam
            ct (optional): Optional, default 0.05. Coefficient for estimation of fundamental period from EC8 4.6: T1=ct*H^(3/4)
            lam (optional): Optional, default 1. Coefficient for estimation of base shear as per EC8 4.5: Fb=Sd(T1)*m*lam

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/lateralforces/'+str(thID)+'/'+qt(loadCaseX)+'/'+qt(loadCaseY)+'/'+str(propMasses)+'/'+str(T1)+'/'+str(ct)+'/'+str(lam)+'', null, null));}
    async areRebarsInsideSection(ID) {
/*        ''' Check if all rebars are inside the section. Only the first fill figure is considered.
        
        Args:
            ID: ID of the section

        Returns:
            Array of integers of the size of the rebars, with: 0 if rebar is outside figure, 1 if it's on a polygon vertex, 2 on border, 3 internal
        '''*/
        return des(await this.nfrest('GET', '/section/rebar/inside/'+qt(ID)+'', null, null));}
    async assignHinge(beamID, hingeName) {
/*        ''' Assign a plastic hinge to a beam
        
        Args:
            beamID: ID of the beam element hosting the hinge
            hingeName: Name of the hinge property to assign

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/hinge/assign/'+qt(beamID)+'/'+qt(hingeName)+'', null, null));}
    async assignMaterialToElement(element, materialID) {
/*        ''' Assign a selected material to the desired element
        
        Args:
            element: ID of the element
            materialID: ID of the material

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/material/assign/'+qt(element)+'/'+str(materialID)+'', null, null));}
    async assignSectionToElement(element, sectionID) {
/*        ''' Assign a selected section to the desired element
        
        Args:
            element: ID of the element
            sectionID: ID of the section

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/section/assign/'+qt(element)+'/'+str(sectionID)+'', null, null));}
    async assignSubsoilProperty(element, prop) {
/*        ''' Assign a subsoil property to the selected element
        
        Args:
            element: ID of the element
            prop: Name of the property to assign

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/springproperty/subsoil/assign/'+qt(element)+'/'+qt(prop)+'', null, null));}
    async assignToGroup(name, nodes, elements, clear=false) {
/*        ''' Assign nodes and/or elements to a previously defined group
        
        Args:
            name: Name of the group
            nodes: Array of nodes
            elements: Array of elements
            clear (optional): Optional. Clear assigned nodes and elements

        Returns:
            False if not existing, True otherwise
        '''*/
        return sbool(await this.nfrest('GET', '/group/assign/'+qt(name)+'/'+str(clear)+'', null, dict([("nodes",JSON.stringify(nodes)),("elements",JSON.stringify(elements))])));}
    async changeDefSolverType(type_) {
/*        ''' Change the system of equation type in standard solver
        
        Args:
            type_: 0 for default (slow, lability detection), 1 for DSS (fast, less memory consumption), 2 for SPOOLES (fast)

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/opt/changedefsolvertype/'+str(type_)+'', null, null));}
    async changeElementProperty(ID, prop, value) {
/*        ''' Change element property
        
        Args:
            ID: ID of the element
            prop: Name of the property to change
            value: New value of property

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('POST', '/element/prop/'+qt(ID)+'/'+qt(prop)+'/'+qt(value)+'', null, null));}
    async changeLoadValue(i, loadValue) {
/*        ''' Change the load value of i-th load entity
        
        Args:
            i: Number of the load, get via getLoadsForNode or getLoadsForElement
            loadValue: New loading value

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/change/'+str(i)+'/'+str(loadValue)+'', null, null));}
    async changeOrAddSectionPoint(sectionID, seriesID, ptID, x, y) {
/*        ''' Change or add a point in an already defined section
        
        Args:
            sectionID: ID of the section
            seriesID: ID of the series, starts at 1
            ptID: Point index in the series, starts at 1. Use 0 to add a point at the beginning of the series
            x: New z coordinate
            y: New y coordinate

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/add/changeaddpt/'+str(sectionID)+'/'+str(seriesID)+'/'+str(ptID)+'/'+str(x)+'/'+str(y)+'', null, null));}
    async changeSolver(type_, path='') {
/*        ''' Change the default solver
        
        Args:
            type_: 0 for default solver, 1 for OpenSees, 2 for CalculiX
            path (optional): Optional. Full path to the solver assembly.

        Returns:
            True if successful, False if path is missing
        '''*/
        return sbool(await this.nfrest('GET', '/op/opt/changesolver/'+str(type_)+'', null, dict([("path",path)])));}
    async changeSpringNLProperty(name, NLdofs, NLprops) {
/*        ''' Change a non-linear spring property already defined in the model
        
        Args:
            name: Name of the property, must be unique
            NLdofs: Array of integers from 0 to 15 to associate a non-linear behaviour to each DoF. Use -1 to leave the DoF inactive
            NLprops: Array containing 6 arrays of numerical properties for the each selected non-linear behaviour

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/springproperty/nl/change/'+qt(name)+'/'+JSON.stringify(NLdofs)+'', NLprops, null));}
    async changeSpringNLPropertyDof(name, DoF, NLtype, NLprops) {
/*        ''' Change a non-linear spring property already defined in the model
        
        Args:
            name: Name of the property, must be unique
            DoF: Dof of the property from 1 to 6
            NLtype: Integer value from 0 to 15 to associate a non-linear behaviour to each DoF. Use -1 to leave the DoF inactive
            NLprops: Array of numerical properties for the selected non-linear behaviour

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/springproperty/nl/change/'+qt(name)+'/'+str(DoF)+'/'+str(NLtype)+'', NLprops, null));}
    async changeSpringProperty(name, Kx, Ky, Kz, Krx, Kry, Krz) {
/*        ''' Change a spring property in the model
        
        Args:
            name: Name of the property, must be unique
            Kx: Stiffness in X direction
            Ky: Stiffness in Y direction
            Kz: Stiffness in Z direction
            Krx: Stiffness in RX direction
            Kry: Stiffness in RY direction
            Krz: Stiffness in RZ direction

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/springproperty/simple/change/'+qt(name)+'/'+str(Kx)+'/'+str(Ky)+'/'+str(Kz)+'/'+str(Krx)+'/'+str(Kry)+'/'+str(Krz)+'', null, null));}
    async checkConnectivity(notPassedElems=null, overlappedNodes=null) {
/*        ''' Check overlapped beam nodes and anti-clockwise connectivity for all the other elements. The function always tries to correct incorrect elements, hence subsequent checks could be negative.
        
        Args:
            notPassedElems (optional): Optional. Empty array eventually filled with elements IDs that don't passed the check. Not available in REST API
            overlappedNodes (optional): Optional. Empty array eventually filled with detected overlapped nodes in Line elements. Not available in REST API

        Returns:
            True if check has been successful for all elements
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/connectivity'+str(notPassedElems)+'/'+str(overlappedNodes)+'', null, null));}
    async checkElement(elem, lc, t, stationType, verName, savelog=false, messages=false, defaultParams=null, logPath=null) {
/*        ''' Check a single element in a model against results.
        
        Args:
            elem: ID of the element to be checked
            lc: Loadcase containing results
            t: Reference time for results. For linear analyses, use "1".
            stationType: 0 for 5 stations, 1 for 3 stations, 2 for I and J, 3 for I only, 4 for J only, 5 for M only, 6 for 1/4, 7 for 3/4, 8 for M and 1/4 and 3/4, 9 for 1/4 and 3/4
            verName: Name of the checking to be used. E.g. "Steel EC3" or "EC2_Concrete". NVV files have underscore.
            savelog (optional): Optionally, log file is written
            messages (optional): Optionally, messages from checking engine are shown
            defaultParams (optional): Optionally, parameters for checking
            logPath (optional): Optionally, returns path of the checking log file

        Returns:
            True if checking is satisfied, False in any other case
        '''*/
        return sbool(await this.nfrest('GET', '/res/check/element/'+qt(elem)+'/'+qt(lc)+'/'+qt(t)+'/'+str(stationType)+'/'+qt(verName)+'/'+str(savelog)+'/'+str(messages)+'', null, dict([("defaultParams",JSON.stringify(defaultParams)),("logPath",logPath)])));}
    async checkElementRatio(elem, lc, t, stationType, verName, savelog=false, messages=false, defaultParams=null, logPath=null) {
/*        ''' Check a single element in a model against results.
        
        Args:
            elem: ID of the element to be checked
            lc: Loadcase containing results
            t: Reference time for results. For linear analyses, use "1".
            stationType: 0 for 5 stations, 1 for 3 stations, 2 for I and J, 3 for I only, 4 for J only, 5 for M only, 6 for 1/4, 7 for 3/4, 8 for M and 1/4 and 3/4, 9 for 1/4 and 3/4
            verName: Name of the checking to be used. E.g. "Steel EC3" or "EC2_Concrete". NVV files have underscore.
            savelog (optional): Optionally, log file is written
            messages (optional): Optionally, messages from checking engine are shown
            defaultParams (optional): Optionally, parameters for checking
            logPath (optional): Optionally, returns path of the checking log file

        Returns:
            A value less than 1 if the element satisfies checking. 100 is returned in case of error
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/check/elementRatio/'+qt(elem)+'/'+qt(lc)+'/'+qt(t)+'/'+str(stationType)+'/'+qt(verName)+'/'+str(savelog)+'/'+str(messages)+'', null, dict([("defaultParams",JSON.stringify(defaultParams)),("logPath",logPath)])));}
    async checkElements(elems, lc, ts, stationType, verName, savelog=false, messages=false, defaultParams=null) {
/*        ''' Check the specified elements in a model against results.
        
        Args:
            elems: IDs of the elements to be checked
            lc: Loadcase containing results
            ts: Reference time for results. For linear analyses, use "1".
            stationType: 0 for 5 stations, 1 for 3 stations, 2 for I and J, 3 for I only, 4 for J only, 5 for M only, 6 for 1/4, 7 for 3/4, 8 for M and 1/4 and 3/4, 9 for 1/4 and 3/4
            verName: Name of the checking to be used. E.g. "Steel EC3" or "EC2_Concrete". NVV files have underscore.
            savelog (optional): Optionally, log file is written
            messages (optional): Optionally, messages from checking engine are shown
            defaultParams (optional): Optionally, parameters for checking

        Returns:
            True if all elements satisfy checking
        '''*/
        return sbool(await this.nfrest('GET', '/res/check/elements/'+qt(lc)+'/'+qt(ts)+'/'+str(stationType)+'/'+qt(verName)+'/'+str(savelog)+'/'+str(messages)+'', null, dict([("defaultParams",JSON.stringify(defaultParams)),("elems",JSON.stringify(elems))])));}
    async checkElementsRatio(elems, lc, ts, stationType, verName, savelog=false, messages=false, defaultParams=null) {
/*        ''' Check the specified elements in a model against results.
        
        Args:
            elems: IDs of the elements to be checked
            lc: Loadcase containing results
            ts: Reference time for results. For linear analyses, use "1".
            stationType: 0 for 5 stations, 1 for 3 stations, 2 for I and J, 3 for I only, 4 for J only, 5 for M only, 6 for 1/4, 7 for 3/4, 8 for M and 1/4 and 3/4, 9 for 1/4 and 3/4
            verName: Name of the checking to be used. E.g. "Steel EC3" or "EC2_Concrete". NVV files have underscore.
            savelog (optional): Optionally, log file is written
            messages (optional): Optionally, messages from checking engine are shown
            defaultParams (optional): Optionally, parameters for checking

        Returns:
            A value less than 1 if all elements satisfy checking. 100 is returned in case of error
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/check/elementsRatio/'+qt(lc)+'/'+qt(ts)+'/'+str(stationType)+'/'+qt(verName)+'/'+str(savelog)+'/'+str(messages)+'', null, dict([("defaultParams",JSON.stringify(defaultParams)),("elems",JSON.stringify(elems))])));}
    async checkElementStation(elem, lc, t, stationAbsissa, verName, defaultParams=null, logPath=null, messages=false) {
/*        ''' Check a single station in a model against results.
        
        Args:
            elem: ID of the element to be checked
            lc: Loadcase containing results
            t: Reference time for results. For linear analyses, use "1".
            stationAbsissa: Absissa of the section to check for the element
            verName: Name of the checking to be used. E.g. "Steel EC3" or "EC2_Concrete". NVV files have underscore.
            defaultParams (optional): Optionally, parameters for checking
            logPath (optional): Path for logging. If empty (default), actual path is returned. If "no", no log is written
            messages (optional): Optional, default is false. If true, activates message dialogs from the checking engine

        Returns:
            A dictionary of string and decimal containing all the values used for checking and results
        '''*/
        return des(await this.nfrest('GET', '/res/check/station/'+qt(elem)+'/'+qt(lc)+'/'+qt(t)+'/'+str(stationAbsissa)+'/'+qt(verName)+'/'+str(messages)+'', null, dict([("defaultParams",JSON.stringify(defaultParams)),("logPath",logPath)])));}
    async checkFreeNodes() {
/*        ''' Check free nodes in the model
        
        
        Returns:
            An array of the detected free nodes.
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/findfreenodes', null, null));}
    async checkLineElements() {
/*        ''' Check line elements and mesh if necessary.
        
        
        Returns:
            The number of meshed line elements
        '''*/
        return parseInt(await this.nfrest('GET', '/op/mesh/lineelems', null, null));}
    async checkModel(lc, ts, stationType, verName, savelog=false, messages=false, defaultParams=null) {
/*        ''' Check the entire model model with results.
        
        Args:
            lc: Loadcase containing results
            ts: Reference time for results. For linear analyses, use "1".
            stationType: 0 for 5 stations, 1 for 3 stations, 2 for I and J, 3 for I only, 4 for J only, 5 for M only, 6 for 1/4, 7 for 3/4, 8 for M and 1/4 and 3/4, 9 for 1/4 and 3/4
            verName: Name of the checking to be used. E.g. "Steel EC3" or "EC2_Concrete". NVV files have underscore, no file extension.
            savelog (optional): Optionally, log file is written
            messages (optional): Optionally, messages from checking engine are shown
            defaultParams (optional): Optionally, parameters for checking

        Returns:
            True if checking is satisfied, False in any other case
        '''*/
        return sbool(await this.nfrest('GET', '/res/check/model/'+qt(lc)+'/'+qt(ts)+'/'+str(stationType)+'/'+qt(verName)+'/'+str(savelog)+'/'+str(messages)+'', null, dict([("defaultParams",JSON.stringify(defaultParams))])));}
    async checkNode(node, lc, ts, verName, savelog=false, messages=false, defaultParams=null, logPath=null) {
/*        ''' Check a single node in a model against results.
        
        Args:
            node: ID of the node to be checked
            lc: Loadcase containing results
            ts: Reference time for results. For linear analyses, use "1".
            verName: Name of the checking to be used. E.g. "Steel EC3" or "EC2_Concrete". NVV files have underscore.
            savelog (optional): Optionally, log file is written
            messages (optional): Optionally, messages from checking engine are shown
            defaultParams (optional): Optionally, parameters for checking
            logPath (optional): Optionally, returns path of the checking log file

        Returns:
            True if node satisfies checking, False otherwise
        '''*/
        return sbool(await this.nfrest('GET', '/res/check/node/'+qt(node)+'/'+qt(lc)+'/'+qt(ts)+'/'+qt(verName)+'/'+str(savelog)+'/'+str(messages)+'', null, dict([("defaultParams",JSON.stringify(defaultParams)),("logPath",logPath)])));}
    async checkNodes(nodes, lc, ts, verName, savelog=false, messages=false, defaultParams=null) {
/*        ''' Check specified nodes in a model against results.
        
        Args:
            nodes: ID of the nodes to be checked
            lc: Loadcase containing results
            ts: Reference time for results. For linear analyses, use "1".
            verName: Name of the checking to be used. E.g. "Steel EC3" or "EC2_Concrete". NVV files have underscore.
            savelog (optional): Optionally, log file is written
            messages (optional): Optionally, messages from checking engine are shown
            defaultParams (optional): Optional. Parameters for checking

        Returns:
            True if nodes satisfy checking, False otherwise
        '''*/
        return sbool(await this.nfrest('GET', '/res/check/nodes/'+qt(lc)+'/'+qt(ts)+'/'+qt(verName)+'/'+str(savelog)+'/'+str(messages)+'', null, dict([("defaultParams",JSON.stringify(defaultParams)),("nodes",JSON.stringify(nodes))])));}
    async checkOverlappedElements() {
/*        ''' Check overlapped elements in the model
        
        
        Returns:
            A list of overlapped elements
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/findoverlappedelements', null, null));}
    async clearElementCustomProperties(elem) {
/*        ''' Clear element custom properties
        
        Args:
            elem: 

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/element/customprop/'+qt(elem)+'', null, null));}
    async clearElementRebar(elem) {
/*        ''' Clear all element rebar
        
        Args:
            elem: ID of the element or Wall group name

        Returns:
            True is successful
        '''*/
        return sbool(await this.nfrest('GET', '/element/rebar/clear/'+qt(elem)+'', null, null));}
    async clearSectionRebar(ID) {
/*        ''' Clear all section rebar
        
        Args:
            ID: ID of the section

        Returns:
            True is successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/rebar/clear/'+str(ID)+'', null, null));}
    async clearSectionRebar(ID) {
/*        ''' Clear all section rebar
        
        Args:
            ID: ID of the section

        Returns:
            True is successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/rebar/clear/'+qt(ID)+'', null, null));}
    async clearSelection() {
/*        ''' Clear selected items. REST version only against local instance of NextFEM Designer
        
        
        Returns:
            
        '''*/
        return sbool(await this.nfrest('GET', '/op/clearselection', null, null));}
    async clearStoredDomains() {
/*        ''' Clear stored resisting domains
        
        
        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/res/check/cleardomains', null, null));}
    async colorizeModel(criterion, excl=null) {
/*        ''' Colorize with random colors all the elements
        
        Args:
            criterion: 1 by section, 2 by material, 3 by group
            excl (optional): Array of integer color to be avoided (e.g. selection colors). Optional - if null, selection colors are used

        Returns:
            
        '''*/
        return await this.nfrest('GET', '/model/colors/colorize/'+str(criterion)+'', null, dict([("excl",JSON.stringify(excl))]));}
    async compileDocX(dict_, tableDict=null, twoPasses=false) {
/*        ''' Compile the open document for keyword substitution
        
        Args:
            dict_: Dictionary of the keywords to be replaced by its values
            tableDict (optional): Dictionary of keywords to be replaced by a table, described by a list of string() - each item of the list represents the single row as an array of string
            twoPasses (optional): Enable double pass for the document

        Returns:
            True
        '''*/
        return sbool(await this.nfrest('POST', '/op/docx/compile/'+str(twoPasses)+'', tableDict, dict([("dict",JSON.stringify(dict_))])));}
    async convertToMeshedSection(sectionID) {
/*        ''' Convert an existing section to a new tria-meshed section. Remember to re-assign the new section to elements with assignSectionToElement
        
        Args:
            sectionID: ID of the original section

        Returns:
            The ID of the new meshed section, 0 if errors occur
        '''*/
        return parseInt(await this.nfrest('GET', '/op/mesh/meshedsection/'+str(sectionID)+'', null, null));}
    async convertUnits(length, force) {
/*        ''' Convert model and results to the specified new units.
        
        Args:
            length: Units for length (e.g. "m", "in", ...)
            force: Units for force (e.g. "N", "kipf", ...)

        Returns:
            
        '''*/
        return await this.nfrest('GET', '/units/convertunits/'+qt(length)+'/'+qt(force)+'', null, null);}
    async convertValue(value, OldUnits, NewUnits) {
/*        ''' Convert units of a value.
        
        Args:
            value: Numerical value to convert
            OldUnits: Old units of the input value. Eg. kN/cm^2
            NewUnits: Target units for the input value. Eg. N/mm^2

        Returns:
            Converted value
        '''*/
        return parseFloat(await this.nfrest('GET', '/units/convert/'+str(value)+'', null, dict([("OldUnits",OldUnits),("NewUnits",NewUnits)])));}
    async convertValueAuto(value, OldUnits) {
/*        ''' Convert units of a value in current model units.
        
        Args:
            value: Numerical value to convert
            OldUnits: Units of the input value. Eg. kN/cm^2

        Returns:
            Array of string with converted value and target units
        '''*/
        return des(await this.nfrest('GET', '/units/convertauto/'+str(value)+'', null, dict([("OldUnits",OldUnits)])));}
    async createDocX(path, text, template='') {
/*        ''' Create a DocX file with the desired text
        
        Args:
            path: Path of the DocX document, consistent with the system conventions, on existing folders
            text: Text to be written in the document
            template (optional): Optional. Path of a DocX template to be used in document generation

        Returns:
            Always true
        '''*/
        return sbool(await this.nfrest('POST', '/op/docx/create', text, dict([("path",path),("template",template)])));}
    async customCheck(formulae) {
/*        ''' Run checking on user formulae. No node or element quantities are given. See also getItemDataResults method.
        
        Args:
            formulae: Dictionary of string and decimal containing formulae (see NextFEM Scripting language reference)

        Returns:
            A dictionary of string and decimal containing all the checking results
        '''*/
        return des(await this.nfrest('POST', '/res/check/item', formulae, null));}
    async CustomLicense(lic) {
/*        ''' Check if a license key is available
        
        Args:
            lic

        Returns:
            True or False
        '''*/
        return sbool(await this.nfrest('GET', '/op/lic', null, dict([("val",lic)])));}
    async defaultColors() {
/*        ''' Revert to default colors
        
        
        Returns:
            
        '''*/
        return await this.nfrest('GET', '/model/colors/default', null, null);}
    async deleteChecks() {
/*        ''' Delete the stored checks.
        
        
        Returns:
            True if operations goes fine.
        '''*/
        return sbool(await this.nfrest('GET', '/res/delchecks', null, null));}
    async deleteDocXheadingByTitle(titles, useLast=false) {
/*        ''' Remove the paragraphs contained in the specified titles
        
        Args:
            titles: Array of paragraph titles to be deleted
            useLast (optional): If true, in case of multiple paragraphs with the same title, only the last one is deleted. Default is false, the first paragraph with the specified titles is deleted

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/op/docx/delheadingsbytitle/'+str(useLast)+'', titles, null));}
    async deleteDocXheadings(headingsIDtoDelete) {
/*        ''' Remove the paragraphs contained in the specified titles
        
        Args:
            headingsIDtoDelete: Array of paragraph IDs to be deleted

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/op/docx/delheadings', headingsIDtoDelete, null));}
    async deleteGroup(name) {
/*        ''' Remove the specified group from model
        
        Args:
            name: Name of the group to be removed

        Returns:
            False if not existing, True otherwise
        '''*/
        return sbool(await this.nfrest('GET', '/group/delete/'+qt(name)+'', null, null));}
    async deleteResults() {
/*        ''' Delete the stored results.
        
        
        Returns:
            True if operations goes fine.
        '''*/
        return sbool(await this.nfrest('GET', '/res/delete', null, null));}
    async divideHexa(hexaID, divX, divY, divZ) {
/*        ''' Divide an existing Hexa element
        
        Args:
            hexaID: ID of the existing Hexa
            divX: Number of divisions in X direction
            divY: Number of divisions in Y direction
            divZ: Number of divisions in Z direction

        Returns:
            An array containing the IDs of newly created Hexa elements
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/dividehexa/'+qt(hexaID)+'/'+str(divX)+'/'+str(divY)+'/'+str(divZ)+'', null, null));}
    async divideLine(lines, fractions) {
/*        ''' Divide existing Line elements
        
        Args:
            lines: Array of Line elements to be divided
            fractions: Division pattern, normalized to 1

        Returns:
            An array containing the IDs of newly created Line elements
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/divideline', null, dict([("lines",JSON.stringify(lines)),("fractions",JSON.stringify(fractions))])));}
    async divideLineByNodes(line, nodes) {
/*        ''' Divide existing Line elements by nodes
        
        Args:
            line: Line element ID
            nodes: Array of nodes ID

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/dividelinebynodes/'+qt(line)+'', null, dict([("nodes",JSON.stringify(nodes))])));}
    async divideQuad(quadID, divX, divY) {
/*        ''' Divide an existing Quad element
        
        Args:
            quadID: ID of the existing Quad
            divX: Number of divisions in X direction
            divY: Number of divisions in Y direction

        Returns:
            An array containing the IDs of newly created Quad elements
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/dividequad/'+qt(quadID)+'/'+str(divX)+'/'+str(divY)+'', null, null));}
    async divideWedge(wedgeID, div) {
/*        ''' Divide an existing Wedge element along its extrusion direction
        
        Args:
            wedgeID: ID of the existing Wedge
            div: Number of divisions

        Returns:
            An array containing the IDs of newly created Wedge elements
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/dividewedge/'+qt(wedgeID)+'/'+str(div)+'', null, null));}
    async duplicateSection(originalID) {
/*        ''' Duplicate the selected section
        
        Args:
            originalID: Original ID of the section to be copied

        Returns:
            The ID of the newly created copy of the section
        '''*/
        return parseInt(await this.nfrest('GET', '/section/duplicate/'+str(originalID)+'', null, null));}
    async elementAvailableFlags() {
/*        ''' Return a dictionary of all flags that can be defined for an element, with their description
        
        
        Returns:
            Dictionary of flags and their descriptions
        '''*/
        return des(await this.nfrest('', '', null, null));}
    async elementFlagList(ID) {
/*        ''' Return a dictionary of all flags defined for the element, with their value
        
        Args:
            ID: ID of the element

        Returns:
            Dictionary of flags and their values
        '''*/
        return des(await this.nfrest('', ''+qt(ID)+'', null, null));}
    async exportDXF(path, extruded, selectedElems=null) {
/*        ''' Export DXF or DWG of the model
        
        Args:
            path: Path of the DXF or DWG file to be saved
            extruded: True if extruded model, false for wireframe
            selectedElems (optional): List of string with selected elements ID. If null (default), entire model is drawed.

        Returns:
            
        '''*/
        return sbool(await this.nfrest('POST', '/op/export/dxf/'+str(extruded)+'', selectedElems, dict([("path",path)])));}
    async exportElevationGroupToDXF(path, groupName, YZplane=false) {
/*        ''' Export the elevation view of selected group of elements to DXF or DWG format. Top rebars will be shown in plan, if present
        
        Args:
            path: Path of the resulting DXF or DWG file
            groupName: Name of the group containing the elments to include in the elevation view
            YZplane (optional): Optional parameter to specify if the elevation view should be in the YZ plane

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/model/group/exportelevdxf/'+qt(groupName)+'/'+str(YZplane)+'', null, dict([("path",path)])));}
    async exportGLTF(path, saveIFC=false) {
/*        ''' Export the model to glTF format for web sharing.
        
        Args:
            path: Path of the file to be saved
            saveIFC (optional): Optional parameter to save IFC to the same folder. Default is false

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/export/gltf/'+str(saveIFC)+'', null, dict([("path",path)])));}
    async exportGroupToDXF(path, groupName) {
/*        ''' Export the plan view of selected group of elements to DXF or DWG format. Top rebars will be shown in plan, if present
        
        Args:
            path: Path of the resulting DXF or DWG file
            groupName: Name of the group containing the elments to include in the plan view

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/model/group/exportdxf/'+qt(groupName)+'', null, dict([("path",path)])));}
    async exportIFC(path, saveAsXML=false) {
/*        ''' Export IFC file
        
        Args:
            path: Path of the file to be saved
            saveAsXML (optional): False is default. True to save in XML format.

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/export/ifc/'+str(saveAsXML)+'', null, dict([("path",path)])));}
    async exportIOM(filename) {
/*        ''' Export model to IDEA StatiCa Open Model format. It generates filename.xml and filename.xmlR for results, if any.
        
        Args:
            filename: Full path for the output model in XML format.

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/export/idea', null, dict([("path",filename)])));}
    async exportMidas(path) {
/*        ''' Export model in MGT format for Midas GEN
        
        Args:
            path: Full path of saved file

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/export/midas', null, dict([("path",path)])));}
    async exportOpenSees(path, loadcase) {
/*        ''' Export model in OpenSees TCL format for a chosen loadcase
        
        Args:
            path: Full path of TCL file
            loadcase: Load case to be exported

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/export/opensees/'+qt(loadcase)+'', null, dict([("path",path)])));}
    async exportRCbeamsDXF(path, elements) {
/*        ''' Export the selected RC beam to DXF or DWG format. Rebars and hoops will be inserted in the drawing, if present
        
        Args:
            path: Path of the resulting DXF or DWG file
            elements: Array of elements to include in DXF

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/element/exportdxf', null, dict([("path",path),("elements",JSON.stringify(elements))])));}
    async exportRCmemberDXF(path, member) {
/*        ''' Export the selected RC member to DXF or DWG format. Rebars and hoops will be inserted in the drawing, if present
        
        Args:
            path: Path of the resulting DXF or DWG file
            member: Member name

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/model/member/exportdxf/'+qt(member)+'', null, dict([("path",path)])));}
    async exportSAF(path) {
/*        ''' Export structural model in SAF file
        
        Args:
            path: Full path of SAF .xlsx file

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/export/saf', null, dict([("path",path)])));}
    async exportSAP2000(path) {
/*        ''' Export model in S2K format for SAP2000
        
        Args:
            path: Full path of saved file

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/export/sap2000', null, dict([("path",path)])));}
    async exportSectionDXF(path, sID) {
/*        ''' Export the selected section to DXF or DWG format. Rebars and hoops are included, if present
        
        Args:
            path: Path of the resulting DXF or DWG file
            sID: ID of the section

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/section/exportdxf/'+str(sID)+'', null, dict([("path",path)])));}
    async exportSpreadsheet(filename, table) {
/*        ''' Export results in spreadsheet format (csv or xlsx)
        
        Args:
            filename: Path of the file to save
            table: List of array of strings, containing each row of the table

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/op/export/table', table, dict([("path",filename)])));}
    async exportWexBIM(path, saveIFC=false, copyViewer=true) {
/*        ''' Export the model to WexBIM format for web sharing.
        
        Args:
            path: Path of the file to be saved
            saveIFC (optional): Optional parameter to save IFC to the same folder. Default is false
            copyViewer (optional): Optional parameter to copy viewer engine files to the same folder. Default is true

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/export/wexbim/'+str(saveIFC)+'/'+str(copyViewer)+'', null, dict([("path",path)])));}
    async exportXMLresults(filename) {
/*        ''' Export results in XML format
        
        Args:
            filename: Path of the file to save

        Returns:
            
        '''*/
        return sbool(await this.nfrest('GET', '/op/export/xmlres', null, dict([("path",filename)])));}
    async functionFromFile(filename, type_=9, units='') {
/*        ''' Load a function from text file.
        
        Args:
            filename: Path of the text file containing function to load
            type_ (optional): 0 displacement TH, 1 velocity TH, 2 acceleration TH, 3 acceleration spectrum, 4 displacement spectrum
            units (optional): Units of measure for data in ordinate (Y)

        Returns:
            The ID of the time series, -1 in case of errors
        '''*/
        return parseInt(await this.nfrest('GET', '/function/fromfile/'+str(type_)+'', null, dict([("units",units),("path",filename)])));}
    async generateFrame(baysX, baysY, sn, ddx, ddy, ddz, sx, sy, sz, matx, maty, matz, lc1='', lc2='', lc3='', Lval1=0, Lval2=0, Lval3=0, loadBeamX=false, rigidfloor=false) {
/*        ''' Generate a spatial frame of desired characteristics
        
        Args:
            baysX: Bays in X direction
            baysY: Bays in Y direction
            sn: Number of storey
            ddx: Bay width along X dir.
            ddy: Bay width along Y dir.
            ddz: Storey height
            sx: Section ID for beams in X
            sy: Section ID for beams in Y
            sz: Section ID for columns
            matx: Material ID for beams in X
            maty: Material ID for beams in Y
            matz: Material ID for columns
            lc1 (optional): Loadcase in which storing loads
            lc2 (optional): Loadcase in which storing loads
            lc3 (optional): Loadcase in which storing loads
            Lval1 (optional): Load value for loadcase 1
            Lval2 (optional): Load value for loadcase 2
            Lval3 (optional): Load value for loadcase 3
            loadBeamX (optional): True for loading beams in X, false for loading beams in Y dir.
            rigidfloor (optional): True to force rigid floor contraints

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/generateframe/'+str(baysX)+'/'+str(baysY)+'/'+str(sn)+'/'+str(ddx)+'/'+str(ddy)+'/'+str(ddz)+'/'+str(sx)+'/'+str(sy)+'/'+str(sz)+'/'+str(matx)+'/'+str(maty)+'/'+str(matz)+'/'+qt(lc1)+'/'+qt(lc2)+'/'+qt(lc3)+'/'+str(Lval1)+'/'+str(Lval2)+'/'+str(Lval3)+'/'+str(loadBeamX)+'/'+str(rigidfloor)+'', null, null));}
    async generateLoadCombinations(type_, comboPrefix='') {
/*        ''' Generate load combinations as per EC1. General Design license is needed to run.
        
        Args:
            type_: Combinations set type: Fundamental 0, Characteristic 1, Frequent 2, Quasi_permanent 3, Serviceability 4, Seismic 5, All 6
            comboPrefix (optional): Optional prefix for generated combinations

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/generate/'+str(type_)+'/'+qt(comboPrefix)+'', null, null));}
    async getAlignedNodes(n1, n2, tol=0) {
/*        ''' Return nodes aligned with the given two as input
        
        Args:
            n1: 1st node as vert3 structure
            n2: 2nd node as vert3 structure
            tol (optional): Optional. Tolerance needed to check alignement. Consider to lower it if n1 and n2 are close.

        Returns:
            A list of nodal IDs
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/alignednodes/'+str(tol)+'', null, dict([("n1",n1),("n2",n2)])));}
    async getAreaByNodes(nodes) {
/*        ''' Get area from the selected nodes
        
        Args:
            nodes: Array of nodes ID

        Returns:
            Area inside the polygon described by nodes
        '''*/
        return parseFloat(await this.nfrest('POST', '/node/area', nodes, null));}
    async getBC(node) {
/*        ''' Get restraints of a single node
        
        Args:
            node: ID of the node

        Returns:
            Boolean array containing True if DOF is restrained
        '''*/
        return des(await this.nfrest('GET', '/bc/get/'+qt(node)+'', null, null));}
    async getBeamDeflection(num, loadcase, time, type_, station) {
/*        ''' Get beam deflection for the selected element, loadcase, time and station
        
        Args:
            num: element no.
            loadcase: 
            time: For linear analysis, set as 1
            type_: 1=local x, 2=local y, 3=local z, 4=local rx, 5=local ry, 6=local rz
            station: Usually a beam has 5 stations (1, 2, 3, 4 or 5)

        Returns:
            The requested value. 0 if something went wrong.
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/beamdeflection/'+qt(num)+'/'+qt(loadcase)+'/'+qt(time)+'/'+str(type_)+'/'+str(station)+'', null, null));}
    async getBeamDeflections(num, loadcase, type_, offsetL=0, numStations=21, time='1') {
/*        ''' Get the beam deflections for the selected number of stations along beam
        
        Args:
            num: Element no.
            loadcase: Loadcase name
            type_: 1=N, 2=Vy, 3=Vz, 4=Mt, 5=My, 6=Mz
            offsetL (optional): Optional. Offset to queue output to another beam (length of the preceding beam).
            numStations (optional): Optional. Number of stations, default is 21.
            time (optional): Optional. Time for non-linear analysis. Default is 1.

        Returns:
            A check structure with positions and values
        '''*/
        return await this.nfrest('GET', '/res/beamdeflections/'+qt(num)+'/'+qt(loadcase)+'/'+str(type_)+'/'+str(offsetL)+'/'+str(numStations)+'/'+qt(time)+'', null, null);}
    async getBeamForce(num, loadcase, time, type_, station) {
/*        ''' Get beam force for the selected element, loadcase, time and station
        
        Args:
            num: element no.
            loadcase: loadcase name
            time: For linear analysis, set as 1
            type_: 1=N, 2=Vy, 3=Vz, 4=Mt, 5=My, 6=Mz
            station: Usually a beam has 5 stations (1, 2, 3, 4 or 5)

        Returns:
            The requested value. 0 if something went wrong.
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/beamforce/'+qt(num)+'/'+qt(loadcase)+'/'+qt(time)+'/'+str(type_)+'/'+str(station)+'', null, null));}
    async getBeamForce2(num, loadcase, time, type_, absissa) {
/*        ''' Get beam force for the selected element, loadcase, time and absissa
        
        Args:
            num: element no.
            loadcase: loadcase name
            time: For linear analysis, set as 1
            type_: 1=N, 2=Vy, 3=Vz, 4=Mt, 5=My, 6=Mz
            absissa: Usually a beam has 5 stations (1, 2, 3, 4 or 5)

        Returns:
            The requested value. 0 if something went wrong.
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/beamforce2/'+qt(num)+'/'+qt(loadcase)+'/'+qt(time)+'/'+str(type_)+'/'+str(absissa)+'', null, null));}
    async getBeamForces(num, loadcase, station, time='1') {
/*        ''' Get all the beam forces for the selected element, loadcase, time and station
        
        Args:
            num: Element no.
            loadcase: Loadcase name
            station: Usually a beam has 5 stations (1, 2, 3, 4 or 5)
            time (optional): Optional. Default is 1 = linear analysis

        Returns:
            A vector of size 6. Null vector if something went wrong
        '''*/
        return des(await this.nfrest('GET', '/res/beamforces/'+qt(num)+'/'+qt(loadcase)+'/'+str(station)+'/'+qt(time)+'', null, null));}
    async getBeamForcesAtNode(elem, node, loadcase, time='1') {
/*        ''' Get all the forces for the selected element at the specified node (beam end), loadcase, time and station
        
        Args:
            elem: Element no.
            node: Reference node no.
            loadcase: Loadcase name
            time (optional): Optional. Default is 1 = linear analysis

        Returns:
            A vector of size 6. Null vector if something went wrong
        '''*/
        return des(await this.nfrest('GET', '/res/beamforcesatnode/'+qt(elem)+'/'+qt(node)+'/'+qt(loadcase)+'/'+qt(time)+'', null, null));}
    async getBeamForcesDiagram(num, loadcase, type_, offsetL=0, numStations=21, time='1') {
/*        ''' Get the beam diagrams values for the selected number of stations along beam
        
        Args:
            num: Element no.
            loadcase: Loadcase name
            type_: 1=N, 2=Vy, 3=Vz, 4=Mt, 5=My, 6=Mz
            offsetL (optional): Optional. Offset to queue output to another beam (length of the preceding beam).
            numStations (optional): Optional. Number of stations, default is 21.
            time (optional): Optional. Time for non-linear analysis. Default is 1.

        Returns:
            A check structure with positions and values
        '''*/
        return await this.nfrest('GET', '/res/beamdiagram/'+qt(num)+'/'+qt(loadcase)+'/'+str(type_)+'/'+str(offsetL)+'/'+str(numStations)+'/'+qt(time)+'', null, null);}
    async getBeamForcesEnvelopeTable(num, stationsMode, loadcases=null) {
/*        ''' Get beam forces consistent envelope, as a table. Envelopes are made on specified loadcases, or on all result cases. Suitable for many combinations or for time-history analyses.
        
        Args:
            num: Element no.
            stationsMode: 0 for 5 stations, 1 for 3 stations, 2 for I and J, 3 for I only, 4 for J only, 5 for M only, 6 for 1/4, 7 for 3/4, 8 for M and 1/4 and 3/4, 9 for 1/4 and 3/4
            loadcases (optional): Array of reference loadcases.

        Returns:
            A table as a list of string arrays.
        '''*/
        return des(await this.nfrest('POST', '/res/beamforcesenvtable/'+qt(num)+'/'+str(stationsMode)+'', loadcases, null));}
    async getBeamResMoments(elemID) {
/*        ''' Get the beam resisting moments for each direction of a beam
        
        Args:
            elemID: ID of the selected element

        Returns:
            An array containing a list of {abscissa,Mrzmax,Mrzmin,Mrymax,Mrymin}
        '''*/
        return des(await this.nfrest('GET', '/res/check/beammoments/'+qt(elemID)+'', null, null));}
    async getBeamResShear(elemID, loadcase='', time='1') {
/*        ''' Get the beam resisting shear for each direction of a beam.   WARNING: This is possible only against results of a given loadcase for the element, otherwise a set of zero forces are given and results would not be accurate
        
        Args:
            elemID: ID of the selected element
            loadcase (optional): Optional. Loadcase for results
            time (optional): Optional. Time for results

        Returns:
            An array containing a list of {abscissa,Vry,-Vry,Vrz,-Vrz}
        '''*/
        return des(await this.nfrest('GET', '/res/check/beamshearres/'+qt(elemID)+'/'+qt(loadcase)+'/'+qt(time)+'', null, null));}
    async getBillOfMaterials(selectedElements=null) {
/*        ''' Get the bill of materials of the current model, or for the selected elements
        
        Args:
            selectedElements (optional): Array of selected element IDs

        Returns:
            The bill of materials as a list of string
        '''*/
        return des(await this.nfrest('POST', '/model/bom', selectedElements, null));}
    async getBuiltInChecking() {
/*        ''' Get available checking scripts.
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/res/check/sets', null, null));}
    async getCenterOfMass(selectedNodes=null) {
/*        ''' Return the center of mass of the model, or of the selected nodes
        
        Args:
            selectedNodes (optional): Array of selected node IDs

        Returns:
            Array in form (x,y,z)
        '''*/
        return des(await this.nfrest('POST', '/model/centermass', selectedNodes, null));}
    async getCheckLogName(ID, lc, t, station='') {
/*        ''' Get the log entry name for a specific node/element check.
        
        Args:
            ID: ID of the node/element that has been checked
            lc: Loadcase containing results
            t: Reference time for results. For linear analyses, use "1".
            station (optional): 1 for I, 2 for ¼, 3 for M, 4 for ¾, 5 for J. Parameter is passed as string in order to account special cases. Empty (or 6) for node checking

        Returns:
            The log entry name that should be in program cache if the node/element has already been checked
        '''*/
        return await this.nfrest('GET', '/res/check/logname/'+qt(ID)+'/'+qt(lc)+'/'+qt(t)+'/'+qt(station)+'', null, null);}
    async getCheckNameByMaterial(ID) {
/*        ''' Get checking-set name from the built-in list
        
        Args:
            ID: ID of the material

        Returns:
            String
        '''*/
        return await this.nfrest('GET', '/res/check/checkbymat/'+qt(ID)+'', null, null);}
    async getCombinationCoeffPsi(subscript, type_) {
/*        ''' Get the current psi combination coefficient
        
        Args:
            subscript: 0 for psi0, 1 for psi1, 2 for psi2
            type_: 1 for variable loading, 2 for wind loads, 3 for snow loading

        Returns:
            Double value
        '''*/
        return parseFloat(await this.nfrest('GET', '/loadcase/getpsi/'+str(subscript)+'/'+str(type_)+'', null, null));}
    async getCombinationDesignType(name) {
/*        ''' Returns an integer representing the combination type
        
        Args:
            name: Name of the combination

        Returns:
            -1 if not defined, 0 Ultimate Limit State, 1 Seismic combination, 2 Serviceability, 3 Serviceability-Characteristic, 4 Serviceability-Frequent, 5 Serviceability-QuasiPermanent
        '''*/
        return parseInt(await this.nfrest('GET', '/loadcase/combo/designtype/'+qt(name)+'', null, null));}
    async getCombinationsByDesignType(type_, servType=0) {
/*        ''' Get an array of linear add combinations of the selected design type
        
        Args:
            type_: The combination type for checking: 0 (default) unknown, 1 ultimate, 2 serviceability, 3 seismic
            servType (optional): The serviceability combination type for checking: 0 (default) unknown, 1 characteristic, 2 frequent, 3 quasi-permanent

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/loadcases/descombos/designtype/'+str(type_)+'/'+str(servType)+'', null, null));}
    async getConnectedElements(node, onlyOfType=-1) {
/*        ''' Get all the elements connected to the specified node
        
        Args:
            node: Node ID
            onlyOfType (optional): Optional. Select only elements of type: unk = 0,line = 1,tria = 2,quad = 3,hexa = 4,wedge = 5,tetra = 6,user = 10,line3 = 20,quad8 = 21,hexa16 = 22,hexa20 = 23,tetra10 = 24,tria6 = 25,wedge15 = 26,spring2nodes = 40

        Returns:
            An array of element IDs
        '''*/
        return des(await this.nfrest('GET', '/node/connectedelements/'+qt(node)+'/'+str(onlyOfType)+'', null, null));}
    async getControlNode() {
/*        ''' Return the ID of the higher central node.
        
        
        Returns:
            ID of node. -1 if not found
        '''*/
        return await this.nfrest('GET', '/op/controlnode', null, null);}
    async getCornerNodes(nodes, lcs) {
/*        ''' Return the corner nodes in a list of nodes
        
        Args:
            nodes: List of node IDs
            lcs: vert3 structure for defining first and second spatial directions

        Returns:
            A list of corner nodes, max 4
        '''*/
        return des(await this.nfrest('GET', '/op/corners', null, dict([("nodes",JSON.stringify(nodes)),("lcs",JSON.stringify(lcs))])));}
    async getCustomData(key) {
/*        ''' Get custom data stored in the model.
        
        Args:
            key: Key, must be unique

        Returns:
            False if the key was not found
        '''*/
        return await this.nfrest('GET', '/model/customdata/'+qt(key)+'', null, null);}
    async getDataPlot(xseries, yseries, transparent, name='', Xunits='', Yunits='', color=0, useDots=true) {
/*        ''' Get plot of the given user data in a PNG image
        
        Args:
            xseries: X series of user data
            yseries: Y series of user data
            transparent: If true, set transparent background
            name (optional): Optional. Title of the plot
            Xunits (optional): Optional. Units for x axis
            Yunits (optional): Optional. Units for y axis
            color (optional): Optional. Default is 0 (black)
            useDots (optional): Optional. Default is false

        Returns:
            Array of bytes
        '''*/
        return await this.nfrestB('GET', '/function/plotdata/'+str(transparent)+'/'+qt(name)+'/'+str(color)+'/'+str(useDots)+'', null, dict([("xseries",JSON.stringify(xseries)),("yseries",JSON.stringify(yseries)),("Xunits",Xunits),("Yunits",Yunits)]))}
    async getDefinedDesignMaterials() {
/*        ''' Return a list of used design material IDs
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/designmaterials', null, null));}
    async getDefinedMaterials() {
/*        ''' Return a list of used material IDs
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/materials', null, null));}
    async getDefinedSections() {
/*        ''' Return a list of used section IDs
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/sections', null, null));}
    async getDesignMaterialProperty(ID, name, units=null) {
/*        ''' Return selected property from a design material
        
        Args:
            ID: Material ID
            name: Name of the property: alphaT, behaviour, code, E, G, fk, ni, Mden, Wden, type
            units (optional): String supplied to function to eventually convert units of returned value

        Returns:
            The requested value as string. Empty in case of error
        '''*/
        return await this.nfrest('GET', '/designmaterial/prop/'+qt(ID)+'/'+qt(name)+'', null, dict([("units",units)]));}
    async getDesignMaterialsLibrary(filter='', type_=0) {
/*        ''' Return an array of string containing design material names from built-in library.
        
        Args:
            filter (optional): Optional. String supporting wildcards for material name
            type_ (optional): Optional. Integer for material type: Steel = 1, Aluminium = 2, Concrete = 3, Timber = 4, Masonry = 5, TensionFragile = 6

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/designmaterials/library/'+qt(filter)+'/'+str(type_)+'', null, null));}
    async getDesignMaterialsLibraryF(filename, filter='', type_=0) {
/*        ''' Return an array of string containing design material names from built-in library.
        
        Args:
            filename: Name of the nfm library, without extension
            filter (optional): Optional. String supporting wildcards for material name
            type_ (optional): Optional. Integer for material type: Steel = 1, Aluminium = 2, Concrete = 3, Timber = 4, Masonry = 5, TensionFragile = 6

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/designmaterials/libraryf/'+qt(filename)+'/'+qt(filter)+'/'+str(type_)+'', null, null));}
    async getDesMaterialLibNames(subproduct='') {
/*        ''' Return an array of string containing design material library names from built-in library.
        
        Args:
            subproduct (optional): Optional. String specifying the subproduct for filtering design material libraries

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/designmaterials/libraries/'+qt(subproduct)+'', null, null));}
    async getDocXheadings() {
/*        ''' Get a list of headings contained in the current DocX document.
        
        
        Returns:
            List of array of strings as (ID, level, title)
        '''*/
        return des(await this.nfrest('GET', '/op/docx/headings', null, null));}
    async getDrawing(name) {
/*        ''' Get the drawing as bytes to be saved in a DXF file
        
        Args:
            name: Name of the construction drawing

        Returns:
            Array of bytes representing the DXF file
        '''*/
        return await this.nfrestB('GET', '/model/drawing/'+qt(name)+'', null, null)}
    async getDXFentities(stream) {
/*        ''' Get drawing entities in the loaded DXF serialized in JSON format
        
        Args:
            stream: Stream to be imported

        Returns:
            String in JSON format
        '''*/
        return await this.nfrest('POST', '/op/import/dxfentities', stream, null);}
    async getElementArea(ID) {
/*        ''' Get element area of planar elements or surface for solids
        
        Args:
            ID: 

        Returns:
            
        '''*/
        return parseFloat(await this.nfrest('GET', '/element/area/'+qt(ID)+'', null, null));}
    async getElementCentroid(ID) {
/*        ''' Return the coordinates of the centroid of the selected element
        
        Args:
            ID: ID of the element

        Returns:
            A double array
        '''*/
        return des(await this.nfrest('GET', '/element/centroid/'+qt(ID)+'', null, null));}
    async getElementChecks(ID, lc, time) {
/*        ''' Get the checks stored in the model for the specified element
        
        Args:
            ID: ID of the element
            lc: Name of the loadcase
            time: Time

        Returns:
            Null if no checking are available
        '''*/
        return await this.nfrest('GET', '/res/check/elementA/'+qt(ID)+'/'+qt(lc)+'/'+qt(time)+'', null, null);}
    async getElementConnectivity(ID) {
/*        ''' Return the connectivity of the specified element.
        
        Args:
            ID: ID of the element

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/element/conn/'+qt(ID)+'', null, null));}
    async getElementCustomProperty(elem, propName) {
/*        ''' Get an already defined element custom property
        
        Args:
            elem: ID of the element
            propName: Property name

        Returns:
            Null string if not set
        '''*/
        return await this.nfrest('GET', '/element/customprop/'+qt(elem)+'/'+qt(propName)+'', null, null);}
    async getElementInfo(element) {
/*        ''' Get text with element properties
        
        Args:
            element: 

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/element/info/'+qt(element)+'', null, null));}
    async getElementOffset(elem) {
/*        ''' Get the element offset for selected beam element
        
        Args:
            elem: ID of the beam element

        Returns:
            An array of size 2 with offset in z and offset in y local directions. Return null array even if the element is not found
        '''*/
        return des(await this.nfrest('GET', '/element/beamoffset/'+qt(elem)+'', null, null));}
    async getElementProperty(ID, name) {
/*        ''' Return selected property of element
        
        Args:
            ID: ID of the element
            name: Name of the property: num, angle, groupE, isJoint, isTruss, isPlaneStress, lun, mat, member, offsetI, offsetJ, sect, set2, sprProp, type

        Returns:
            The requested value as string. Empty in case of error
        '''*/
        return await this.nfrest('GET', '/element/prop/'+qt(ID)+'/'+qt(name)+'', null, null);}
    async getElementRebarCoords(elem, progr) {
/*        ''' Get rebar coordinates from selected element
        
        Args:
            elem: ID of the element or group name
            progr: Progressive abscissa (relative value from 0 to 1)

        Returns:
            Array of X,Y coordinates of size (rebarNumber,2). Coordinates are always referred to the center of reinforcement
        '''*/
        return des(await this.nfrest('GET', '/element/rebar/coords/'+qt(elem)+'/'+str(progr)+'', null, null));}
    async getElementRebarSegments(elem) {
/*        ''' Get rebar segments with their initial and final position, in percentage of element length
        
        Args:
            elem: ID of the element or group name

        Returns:
            An array of double with {Linital, Lfinal} for each segment. The number of segment is the lenght of the array divided by 2
        '''*/
        return des(await this.nfrest('GET', '/section/rebar/segments/'+qt(elem)+'', null, null));}
    async getElementRebarSize(elem, progr) {
/*        ''' Get rebar dimensions from selected element
        
        Args:
            elem: ID of the element or group name
            progr: Progressive abscissa (relative value from 0 to 1)

        Returns:
            
        '''*/
        return des(await this.nfrest('GET', '/element/rebar/size/'+qt(elem)+'/'+str(progr)+'', null, null));}
    async getElementsChecks(lc, time) {
/*        ''' Get the checks stored in the model for elements
        
        Args:
            lc: Name of the loadcase
            time: Time

        Returns:
            Null if no checking are available
        '''*/
        return des(await this.nfrest('GET', '/res/check/elementsA/'+qt(lc)+'/'+qt(time)+'', null, null));}
    async getElementsChecksByMat(mat) {
/*        ''' Get the checks stored in the model for the selected material type
        
        Args:
            mat: Material type: Steel = 1, Aluminium = 2, Concrete = 3, Timber = 4, Masonry = 5, TensionFragile = 6, Fire Resistant = 7

        Returns:
            Null if no checking are available
        '''*/
        return des(await this.nfrest('GET', '/res/check/elementsM/'+str(mat)+'', null, null));}
    async getElementsFromGroup(name) {
/*        ''' Get elements from group
        
        Args:
            name: Group name

        Returns:
            
        '''*/
        return des(await this.nfrest('GET', '/group/elements/'+qt(name)+'', null, null));}
    async getElementType(ID) {
/*        ''' Get element type: unk = 0,line = 1,tria = 2,quad = 3,hexa = 4,wedge = 5,tetra = 6,user = 10,line3 = 20,quad8 = 21,hexa16 = 22,hexa20 = 23,tetra10 = 24,tria6 = 25,wedge15 = 26,spring2nodes = 40
        
        Args:
            ID: ID of the element

        Returns:
            A string describing the element type
        '''*/
        return await this.nfrest('GET', '/element/type/'+qt(ID)+'', null, null);}
    async getElementVolume(ID) {
/*        ''' Get element volume for solids
        
        Args:
            ID: 

        Returns:
            
        '''*/
        return parseFloat(await this.nfrest('GET', '/element/volume/'+qt(ID)+'', null, null));}
    async getEndRelease(beamID) {
/*        ''' Give beam releases ratios. If 0, the dof is completely released.
        
        Args:
            beamID: ID of the beam

        Returns:
            Matrix of double of size [2,6], 6 for end I and 6 for end J. -1 means the DoF is not released
        '''*/
        return des(await this.nfrest('GET', '/element/beamendrelease/'+qt(beamID)+'', null, null));}
    async getEnvelopeCombination(name) {
/*        ''' Return a check object with loadcases and corresponding factors for desired envelope load combination.
        
        Args:
            name: Name of load combination

        Returns:
            A check object
        '''*/
        return await this.nfrest('GET', '/loadcase/combo/getenv/'+qt(name)+'', null, null);}
    async getExtrudedBeamPoints(elemID) {
/*        ''' Get points from the extruded beam section in 3D space
        
        Args:
            elemID: ID of the beam element

        Returns:
            Array of vert3 instances
        '''*/
        return des(await this.nfrest('GET', '/element/extrudedbeam/'+qt(elemID)+'', null, null));}
    async getFireSectionImage(elemID, titleX='', titleY='', title='', quoteUnits='', quoteFormat='0.00', showAxes=true, showOrigin=0, transparent=false) {
/*        ''' Get section plot into an array of Bytes of Png image
        
        Args:
            elemID: ID of the element with the desired section
            titleX (optional): Optional title for X axis
            titleY (optional): Optional title for Y axis
            title (optional): Optional graph title
            quoteUnits (optional): Optional. Units of quotes, if set display quotes
            quoteFormat (optional): Optional. Numeric format of quotes
            showAxes (optional): Optional, default true
            showOrigin (optional): Optional, default 0. 1 to show Z and Y arrows, 2 for X and Y arrows
            transparent (optional): Optional, default false. If true, set transparent background

        Returns:
            Array of bytes
        '''*/
        return await this.nfrestB('GET', '/op/sectioncalc/fireimage/'+str(elemID)+'/'+qt(titleX)+'/'+qt(titleY)+'/'+qt(title)+'/'+qt(quoteUnits)+'/'+qt(quoteFormat)+'/'+str(showAxes)+'/'+str(showOrigin)+'/'+str(transparent)+'', null, null)}
    async getFirstMode(ct=0.05, direction=0) {
/*        ''' Get from results or estimate the fundamental period of the structure. If no results are available, relationship as per EC8 4.6 is used.
        
        Args:
            ct (optional): Optional, default 0.05. Coefficient for estimation of fundamental period from EC8 4.6: T1=ct*H^(3/4)
            direction (optional): Optional, default 0 (no specific direction). Direction of the seismic action to get proper period

        Returns:
            The first period of the model
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/firstmode/'+str(ct)+'/'+str(direction)+'', null, null));}
    async getFloorLoadType(name) {
/*        ''' Get a string describing the selected floor load type
        
        Args:
            name: Name of the floor load type

        Returns:
            String
        '''*/
        return await this.nfrest('GET', '/load/floor/planetype/'+qt(name)+'', null, null);}
    async getFloorPlanes() {
/*        ''' Return a list of defined floor planes
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/load/floor/planesget', null, null));}
    async getForceUnit() {
/*        ''' Get the unit for force in the model
        
        
        Returns:
            The unit for force in the model
        '''*/
        return await this.nfrest('GET', '/units/f', null, null);}
    async getFreeElementID() {
/*        ''' Get the next free element ID
        
        
        Returns:
            Int64 value
        '''*/
        return await this.nfrest('GET', '/op/freeelementid', null, null);}
    async getFreeNodeID() {
/*        ''' Get the next free node ID
        
        
        Returns:
            Int64 value
        '''*/
        return await this.nfrest('GET', '/op/freenodeid', null, null);}
    async getFunctionGeneralData(funcID) {
/*        ''' Get custom data stored in the selected function
        
        Args:
            funcID: ID of the function

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/function/gendata/'+str(funcID)+'', null, null));}
    async getFunctionName(funcID) {
/*        ''' Get name of the selected function
        
        Args:
            funcID: ID of the function

        Returns:
            String
        '''*/
        return await this.nfrest('GET', '/function/name/'+str(funcID)+'', null, null);}
    async getFunctionPlot(funcID, imagePath) {
/*        ''' Get plot of the selected function
        
        Args:
            funcID: ID of the function
            imagePath: Path of the PNG image to be written

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/function/plot/'+str(funcID)+'', null, dict([("path",imagePath)])));}
    async getFunctions() {
/*        ''' Get a list of IDs of already defined functions
        
        
        Returns:
            Array of Int32
        '''*/
        return des(await this.nfrest('GET', '/functions', null, null));}
    async getFunctionUnits(funcID) {
/*        ''' Get units of the selected function (Y values)
        
        Args:
            funcID: ID of the function

        Returns:
            String
        '''*/
        return await this.nfrest('GET', '/function/units/'+str(funcID)+'', null, null);}
    async getGreekLetter(input) {
/*        ''' Return the corresponding letter from Greek alphabet
        
        Args:
            input: Latin letter to convert

        Returns:
            String
        '''*/
        return await this.nfrest('GET', '/op/greek'+qt(input)+'', null, null);}
    async getGroups() {
/*        ''' Get all groups in the model
        
        
        Returns:
            An array with names of groups
        '''*/
        return des(await this.nfrest('GET', '/groups', null, null));}
    async getHTMLlogCheck(logName) {
/*        ''' Get the HTML log of the last checking run. Use getCheckLogName to get the name of a specific check.
        
        Args:
            logName: Name of the log to retrieve

        Returns:
            The HTML log as a string
        '''*/
        return await this.nfrest('POST', '/res/check/htmllog', logName, null);}
    async getItemDataResults(item, lc, t, station=0) {
/*        ''' Get properties and results for the selected node or element
        
        Args:
            item: ID of the item (node or element) to be checked. If item is an element, specify a non-zero station
            lc: Loadcase containing results
            t: Reference time for results. For linear analyses, use "1".
            station (optional): Optional, default 0. Use: 1 fo I, 2 for 1/4, 3 for M, 4 for 3/4, 5 for J. For elements other than lines, use 1

        Returns:
            A dictionary of string and decimal containing all the values used for checking and results
        '''*/
        return des(await this.nfrest('GET', '/res/check/data/'+qt(item)+'/'+qt(lc)+'/'+qt(t)+'/'+str(station)+'', null, null));}
    async getLanguage() {
/*        ''' Get language code (eg. "en" for English)
        
        
        Returns:
            String
        '''*/
        return await this.nfrest('GET', '/op/opt/lang', null, null);}
    async getLastBilinearMomentCurvature() {
/*        ''' Get bilinearized moment-curvature of the last section calculated in getSectMomentCurvature
        
        
        Returns:
            A list of arrays of double (size 2)
        '''*/
        return des(await this.nfrest('GET', '/op/sectioncalc/bilmomentcurvature', null, null));}
    async getLastMomentCurvatureData() {
/*        ''' Get last moment-curvature extended data for the last section calculated in getSectMomentCurvature
        
        
        Returns:
            List of array of strings
        '''*/
        return des(await this.nfrest('GET', '/op/sectioncalc/momentcurvaturedata', null, null));}
    async getLastRunLog() {
/*        ''' Get analysis log for the last run
        
        
        Returns:
            An array of string, empty if not available
        '''*/
        return des(await this.nfrest('GET', '/op/runlog', null, null));}
    async getLastSectionRes3DDomainPoints(conn=null) {
/*        ''' Get list of 3D points for plotting 3D resisting domain of the last computed section
        
        Args:
            conn (optional): Optional. Connectivity dictionary for 3D points passed by reference

        Returns:
            A list of vert3 containing 3D points of the domain boundary
        '''*/
        return des(await this.nfrest('GET', '/res/check/plot3dsectiondomain'+str(conn)+'', null, null));}
    async getLastSectionResDomainPoints(domainType, cleanResponseTolerance=0) {
/*        ''' Get list of points for plotting resisting domain of the last computed sections
        
        Args:
            domainType: 0 for Myy vs. Mzz, 1 for N vs. Myy, 2 for N vs. Mzz
            cleanResponseTolerance (optional): Optional, default is 0. Clean points given in N-Mxx domains, to be used only if wrong plot is obtained (e.g. set to 1e-8)

        Returns:
            A list of array of double values, each of size 2 (X,Y)
        '''*/
        return des(await this.nfrest('GET', '/res/check/lastplotsectiondomain/'+str(domainType)+'/'+str(cleanResponseTolerance)+'', null, null));}
    async getLenUnit() {
/*        ''' Get the unit for length in the model
        
        
        Returns:
            The unit for length in the model
        '''*/
        return await this.nfrest('GET', '/units/l', null, null);}
    async getLinearAddCombination(name) {
/*        ''' Return a check object with loadcases and corresponding factors for desired load combination.
        
        Args:
            name: Name of load combination

        Returns:
            A check object
        '''*/
        return await this.nfrest('GET', '/loadcase/combo/get/'+qt(name)+'', null, null);}
    async getLoad(i) {
/*        ''' Returns a string describing of the i-th load in the model. Use valueFromString to extract data from line (except for Data, which reports one value per line)
        
        Args:
            i: ID of the load, starting from 0.

        Returns:
            Returns a description of the i-th load in the model. Empty string if not found
        '''*/
        return await this.nfrest('GET', '/load/'+str(i)+'', null, null);}
    async getLoadA(i) {
/*        ''' Returns an array of strings describing of the i-th load in the model (ID,Node,Element,Direction,Load value,Load case)
        
        Args:
            i: ID of the load, starting from 0.

        Returns:
            Returns a description of the i-th load in the model. Empty string if not found
        '''*/
        return des(await this.nfrest('GET', '/load/getA/'+str(i)+'', null, null));}
    async getLoadcaseFactor(loadcase) {
/*        ''' Get load factor for the function associated to the selected loadcase
        
        Args:
            loadcase: Name of the loadcase

        Returns:
            Double value
        '''*/
        return parseFloat(await this.nfrest('GET', '/loadcase/getfactor/'+qt(loadcase)+'', null, null));}
    async getLoadCaseFunction(loadcase) {
/*        ''' Get the function associated to the selected loadcase
        
        Args:
            loadcase: Name of the loadcase

        Returns:
            0 if not function is associates, the ID of the function otherwise
        '''*/
        return parseInt(await this.nfrest('GET', '/loadcase/getfunc/'+qt(loadcase)+'', null, null));}
    async getLoadCases() {
/*        ''' Get the names of loadcases set in the model.
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/loadcases', null, null));}
    async getLoadCaseType(name) {
/*        ''' Get loadcase type
        
        Args:
            name: Name of the loadcase

        Returns:
            Integer type: 0 Dead, 1 Live, 2 Wind, 3 Snow, 4 User, 5 Quake, 6 unknown, 7 Thermal, 8 Prestress
        '''*/
        return parseInt(await this.nfrest('GET', '/loadcase/gettype/'+qt(name)+'', null, null));}
    async getLoadCombinations(includeEnvelopes=true) {
/*        ''' Get the names of load combinations set in the model.
        
        Args:
            includeEnvelopes (optional): Optional. False to exclude envelopes

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/loadcases/combos/'+str(includeEnvelopes)+'', null, null));}
    async getLoadCombinationsTable(includeEnvelopes=true) {
/*        ''' Get the load combinations table set in the model.
        
        Args:
            includeEnvelopes (optional): Optional. False to exclude envelopes

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/loadcases/combostable/'+str(includeEnvelopes)+'', null, null));}
    async getLoadDurationClass(loadcase) {
/*        ''' Returns the load duration class for the requested loadcase
        
        Args:
            loadcase: Name of the loadcase

        Returns:
            0 Permanent, 1 Long term, 2 Medium term, 3 Short term, 4 Istantaneous. If not defined yet, return 0 (permanent)
        '''*/
        return parseInt(await this.nfrest('GET', '/load/getduration/'+qt(loadcase)+'', null, null));}
    async getLoadingData() {
/*        ''' Retrieve custom data about wind, snow and other custom loading
        
        
        Returns:
            String
        '''*/
        return await this.nfrest('GET', '/model/loadingdata', null, null);}
    async getLoadsForElement(element) {
/*        ''' Produces a list of load IDs for a single element.
        
        Args:
            element: ID of the element

        Returns:
            Produces as list of load IDs for a single element.
        '''*/
        return des(await this.nfrest('GET', '/load/element/get/'+qt(element)+'', null, null));}
    async getLoadsForNode(node) {
/*        ''' Produces a list of load IDs for a single node.
        
        Args:
            node: ID of the node

        Returns:
            Produces as list of load IDs for a single node.
        '''*/
        return des(await this.nfrest('GET', '/load/node/get/'+qt(node)+'', null, null));}
    async getLoadsInLoadcase(loadcase) {
/*        ''' Produces a list of load IDs for a single loadcase.
        
        Args:
            loadcase: Loadcase name

        Returns:
            Array of Int32
        '''*/
        return des(await this.nfrest('GET', '/load/inloadcase/'+qt(loadcase)+'', null, null));}
    async getLocalAxes(ID) {
/*        ''' Return local axes of an element as API.vert3
        
        Args:
            ID: 

        Returns:
            
        '''*/
        return des(await this.nfrest('GET', '/element/lcs/'+qt(ID)+'', null, null));}
    async getLocalAxesArray(ID) {
/*        ''' Return local axes of an element as array of double {x1,x2,x3,y1,y2,y3,z1,z2,z3}
        
        Args:
            ID: 

        Returns:
            Array of double
        '''*/
        return des(await this.nfrest('GET', '/element/lcsA/'+qt(ID)+'', null, null));}
    async getMacroelement(elemID) {
/*        ''' Get the macroelement type assigned to the selected element
        
        Args:
            elemID: Selected element ID

        Returns:
            Line=0, Line3=1, Quad1=2, Quad2=3, Quad3=4, masonryWall=5, rigidWall=6, -1 if not assigned
        '''*/
        return parseInt(await this.nfrest('GET', '/element/macro/'+qt(elemID)+'', null, null));}
    async getMaterialLibNames() {
/*        ''' Return an array of string containing material library names from built-in library.
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/materials/libraries', null, null));}
    async getMaterialProperty(ID, name, units=null) {
/*        ''' Return selected property from a material
        
        Args:
            ID: Material ID
            name: Name of the property: alphaT, behaviour, code, E, G, fk, ni, Mden, Wden, type
            units (optional): String supplied to function to eventually convert units of returned value

        Returns:
            The requested value as string. Empty in case of error
        '''*/
        return await this.nfrest('GET', '/material/prop/'+qt(ID)+'/'+qt(name)+'', null, dict([("units",units)]));}
    async getMaterialsLibrary(filter='', type_=0) {
/*        ''' Return an array of string containing material names from built-in library.
        
        Args:
            filter (optional): Optional. String supporting wildcards for material name
            type_ (optional): Optional. Integer for material type: Steel = 1, Aluminium = 2, Concrete = 3, Timber = 4, Masonry = 5, TensionFragile = 6

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/materials/library/'+qt(filter)+'/'+str(type_)+'', null, null));}
    async getMaterialsLibraryF(filename, filter='', type_=0) {
/*        ''' Return an array of string containing material names from built-in library.
        
        Args:
            filename: Name of the nfm library, without extension
            filter (optional): Optional. String supporting wildcards for material name
            type_ (optional): Optional. Integer for material type: Steel = 1, Aluminium = 2, Concrete = 3, Timber = 4, Masonry = 5, TensionFragile = 6

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/materials/libraryf/'+qt(filename)+'/'+qt(filter)+'/'+str(type_)+'', null, null));}
    async getMaxElementID() {
/*        ''' Get the max free element ID
        
        
        Returns:
            Int64 value
        '''*/
        return await this.nfrest('GET', '/op/maxelementid', null, null);}
    async getMaxMinBeamForces(sectionID, type_) {
/*        ''' Get maximum and minimum beam forces from elements having the same section, in all loadcases and all stations
        
        Args:
            sectionID: Section ID
            type_: 1=N, 2=Vy, 3=Vz, 4=Mt, 5=My, 6=Mz

        Returns:
            An array of length 2 containing max and min force for the desired type
        '''*/
        return des(await this.nfrest('GET', '/res/maxminbeamforces/'+str(sectionID)+'/'+str(type_)+'', null, null));}
    async getMaxMinNodeDispl(dir_, nodes=null) {
/*        ''' Get maximum and minimum nodal displacement from all nodal results.
        
        Args:
            dir_: Direction: 1 xyz, 2 x, 3 y, 4 z, 5 xy, 6 yz, 7 xz, 8 rxyz (rotations)
            nodes (optional): 

        Returns:
            
        '''*/
        return des(await this.nfrest('POST', '/res/maxmindispl/'+str(dir_)+'', nodes, null));}
    async getMaxMinWoodArmerMoments(elementID) {
/*        ''' Get maximum and minimun Wood-Armer moments from elements in the same group of the selected element
        
        Args:
            elementID: One element in wall or slab group

        Returns:
            An array of length 2 containing max and min moments in this order: bottom dir.x, botton dir.y, top dir.x, top dir.y
        '''*/
        return des(await this.nfrest('GET', '/res/maxminwoodarmer/'+str(elementID)+'', null, null));}
    async getMaxMinWoodArmerMoments(groupName) {
/*        ''' Get maximum and minimun Wood-Armer moments from elements in the same group of the selected element
        
        Args:
            groupName: Wall or slab group name

        Returns:
            An array of length 2 containing max and min moments in this order: bottom dir.x, botton dir.y, top dir.x, top dir.y
        '''*/
        return des(await this.nfrest('GET', '/res/maxminwoodarmerg/'+qt(groupName)+'', null, null));}
    async getMaxNodeID() {
/*        ''' Get the max free node ID
        
        
        Returns:
            Int64 value
        '''*/
        return await this.nfrest('GET', '/op/maxnodeid', null, null);}
    async getMemberElements(member) {
/*        ''' Get the IDs of beam elements grouped in a member.
        
        Args:
            member: Member ID

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/model/member/elems/'+qt(member)+'', null, null));}
    async getMemberLength(member) {
/*        ''' Get member length
        
        Args:
            member: Member ID

        Returns:
            Double
        '''*/
        return parseFloat(await this.nfrest('GET', '/model/member/leng/'+qt(member)+'', null, null));}
    async getMembers() {
/*        ''' Get a list of members defined in the model
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/model/member/all', null, null));}
    async getModalPeriod(num, loadcase) {
/*        ''' Get a modal period of the structure or the buckling factor
        
        Args:
            num: Number of the mode
            loadcase: Name of the loadcase

        Returns:
            0 if not found or error
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/period/'+str(num)+'/'+qt(loadcase)+'', null, null));}
    async getModes(loadcase=null) {
/*        ''' Get the number of available modes in results
        
        Args:
            loadcase (optional): Optional. Name of the loadcase, if empty the first avaialble modal o response spectrum data is used

        Returns:
            loadcase parameters is passed by reference, hence the selected loadcase is returned if loadcase is empty
        '''*/
        return parseInt(await this.nfrest('GET', '/res/modes/'+str(loadcase)+'', null, null));}
    async getMultiplePlots(plotList, transparent=false, names=null, Xunits='', Yunits='', colors=null, useDots=null, showLegend=false) {
/*        ''' Get plots of multiple series in a single PNG image
        
        Args:
            plotList: List of list of double[2] arrays
            transparent (optional): If true, set transparent background
            names (optional): Optional. Titles of the plots
            Xunits (optional): Optional. Units for x axis
            Yunits (optional): Optional. Units for y axis
            colors (optional): Optional. Array of plot colors
            useDots (optional): Optional. Array of boolean values for using dots in each plot
            showLegend (optional): Optional. True to enable graph legend

        Returns:
            List of arrays of bytes
        '''*/
        return await this.nfrestB('POST', '/function/plotmultipledata/'+str(transparent)+'/'+JSON.stringify(names)+'/'+qt(Xunits)+'/'+qt(Yunits)+'/'+str(showLegend)+'', plotList, dict([("colors",JSON.stringify(colors)),("useDots",JSON.stringify(useDots))]))}
    async getNodalDisp(num, loadcase, time, direction) {
/*        ''' Get nodal displacement from the selected loadcase and time
        
        Args:
            num: node no.
            loadcase: loadcase name
            time: time
            direction: Global direction: 1=X, 2=Y, 3=Z, 4=RX, 5=RY, 6=RZ

        Returns:
            The requested value. 0 if something went wrong.
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/displacement/'+qt(num)+'/'+qt(loadcase)+'/'+qt(time)+'/'+str(direction)+'', null, null));}
    async getNodalReact(num, loadcase, time, direction) {
/*        ''' Get nodal reaction from the selected loadcase and time
        
        Args:
            num: node no.
            loadcase: loadcase name
            time: time
            direction: Global direction: 1=X, 2=Y, 3=Z, 4=RX, 5=RY, 6=RZ

        Returns:
            The requested value. 0 if something went wrong.
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/reaction/'+qt(num)+'/'+qt(loadcase)+'/'+qt(time)+'/'+str(direction)+'', null, null));}
    async getNodalShellForce(num, loadcase, time, type_) {
/*        ''' Get nodal shell forces from nodes connected to shell elements
        
        Args:
            num: Node number
            loadcase: Loadcase name
            time: Time value in results, for linear analyses is 1
            type_: Name of the property to get

        Returns:
            The requested value. 0 if something went wrong.
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/nodalshellforce/'+qt(num)+'/'+qt(loadcase)+'/'+qt(time)+'/'+qt(type_)+'', null, null));}
    async getNodalStress(num, loadcase, time, type_) {
/*        ''' Get stress from node
        
        Args:
            num: Node number
            loadcase: Loadcase name
            time: Time value in results, for linear analyses is 1
            type_: Name of the property to get

        Returns:
            The requested value. 0 if something went wrong.
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/nodalstress/'+qt(num)+'/'+qt(loadcase)+'/'+qt(time)+'/'+qt(type_)+'', null, null));}
    async getNodeChecks(ID, lc, time) {
/*        ''' Get the checks stored in the model for the specified node
        
        Args:
            ID: ID of the element
            lc: Name of the loadcase
            time: Time

        Returns:
            Null if no checking are available
        '''*/
        return await this.nfrest('GET', '/res/check/nodsA/'+qt(ID)+'/'+qt(lc)+'/'+qt(time)+'', null, null);}
    async getNodeCoordinates(ID) {
/*        ''' Returns node coordinates as double array
        
        Args:
            ID: ID of the node

        Returns:
            Array of doubles
        '''*/
        return des(await this.nfrest('GET', '/node/'+qt(ID)+'', null, null));}
    async getNodeInfo(node) {
/*        ''' Get text with node properties
        
        Args:
            node: ID of the node

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/node/info/'+qt(node)+'', null, null));}
    async getNodePosition(ID) {
/*        ''' Returns node position as vert3 object
        
        Args:
            ID: ID of the node

        Returns:
            A vert3 object
        '''*/
        return await this.nfrest('GET', '/nodev/'+qt(ID)+'', null, null);}
    async getNodeProperty(ID, name) {
/*        ''' Return selected property of node
        
        Args:
            ID: ID of the node
            name: Name of the property: num, nonStr, isJoint

        Returns:
            The requested value as string. Empty in case of error
        '''*/
        return await this.nfrest('GET', '/node/prop/'+qt(ID)+'/'+qt(name)+'', null, null);}
    async getNodesChecks(lc, time) {
/*        ''' Get the checks stored in the model for nodes
        
        Args:
            lc: Name of the loadcase
            time: Time

        Returns:
            Null if no checking are available
        '''*/
        return des(await this.nfrest('GET', '/res/check/nodesA/'+qt(lc)+'/'+qt(time)+'', null, null));}
    async getNodesFromCoords(dir_, coord, tol=1E-06) {
/*        ''' Get nodes having the specified coordinates
        
        Args:
            dir_: 1 for X, 2 for Y and 3 for Z
            coord: Values of the selected coordinate
            tol (optional): Optional. Tolerance, default values is 1.e-6

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/nodesbycoords/'+str(dir_)+'/'+str(coord)+'/'+str(tol)+'', null, null));}
    async getNodesFromGroup(name) {
/*        ''' Get nodes from group
        
        Args:
            name: Group name

        Returns:
            
        '''*/
        return des(await this.nfrest('GET', '/group/nodes/'+qt(name)+'', null, null));}
    async getNodesOnSides(nodes, tol=4.94065645841247E-324) {
/*        ''' Get nodes on borders of the selected rectangular shell region
        
        Args:
            nodes: Array of nodes
            tol (optional): Optional. Tolerance

        Returns:
            Array of size 4 with bottom, right, top and left nodes
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/borders/'+str(tol)+'', null, dict([("nodes",JSON.stringify(nodes))])));}
    async getOSprocedureName() {
/*        ''' Return the NextFEM procedure file for OpenSees, without .tcl extension
        
        
        Returns:
            String
        '''*/
        return await this.nfrest('GET', '/op/export/osproc', null, null);}
    async getParticipatingMassesRatios(mode, loadcase) {
/*        ''' Get ratios of participating masses from modal or response spectrum analysis
        
        Args:
            mode: Mode number
            loadcase: Name of the loadcase

        Returns:
            Array of double
        '''*/
        return des(await this.nfrest('GET', '/res/partmasses/'+str(mode)+'/'+qt(loadcase)+'', null, null));}
    async getParticipationFactors(mode, loadcase) {
/*        ''' Get participation factors from modal or response spectrum analysis
        
        Args:
            mode: Mode number
            loadcase: Name of the loadcase

        Returns:
            Array of double
        '''*/
        return des(await this.nfrest('GET', '/res/partfactors/'+str(mode)+'/'+qt(loadcase)+'', null, null));}
    async getReinfPropertiesNTC(matID, secID, CF, betaAng, Hshear, Bshear, outInMPa=false) {
/*        ''' Get design data for FRP/FRCM strips as per CNR DT 200 Italian code
        
        Args:
            matID: ID of the FRP/FRCM design material
            secID: ID of the associated section. Must have a material already assigned
            CF: Confidence factor
            betaAng: Angle of FRP strips for shear resistance, in degrees
            Hshear: Height of FRP strips for shear resistance
            Bshear: Width of FRP strips for shear resistance in section z direction
            outInMPa (optional): Optional, default is false. Set as true if you want output in MPa

        Returns:
            A dictionary of string, double values
        '''*/
        return des(await this.nfrest('GET', '/material/frpdata/'+str(matID)+'/'+str(secID)+'/'+str(CF)+'/'+str(betaAng)+'/'+str(Hshear)+'/'+str(Bshear)+'/'+str(outInMPa)+'', null, null));}
    async getResultHistory(loadcase, itemID, resultType, resultID1=0, resultID2=0) {
/*        ''' Get result history for the selected quantity
        
        Args:
            loadcase: Name of the loadcase
            itemID: Node or element ID
            resultType: Time=0, nodal displ.=1, nodal velocity=2, nodal acceleration=3, nodal reaction=4, nodal force=5, nodal stress=6, nodal strain=7,
 beam force=8, beam deflection=9, spring state variable=10, nodal temperture=11
            resultID1 (optional): Required for all types of data except time and temperature, starts at 1
            resultID2 (optional): Required for beam data, 1=N/x, 2=Vy/y, 3=Vz/z, 4=Mt/rx, 5=My/ry, 6=Mz/rz

        Returns:
            Array of double
        '''*/
        return des(await this.nfrest('GET', '/res/hist/'+qt(loadcase)+'/'+qt(itemID)+'/'+str(resultType)+'/'+str(resultID1)+'/'+str(resultID2)+'', null, null));}
    async getRigidDiaphragms() {
/*        ''' Gives the list of master nodes in rigid diaphragms
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/rigiddiaph', null, null));}
    async getRigidOffsets(beamID) {
/*        ''' Get beam end offset length ratios, or and array of 0 if no end offset is present
        
        Args:
            beamID: ID of the beam element

        Returns:
            Return an array of size 2 with the relative length of the rigid offset for ends I and J, respectively
        '''*/
        return des(await this.nfrest('GET', '/element/beamendoffset/'+qt(beamID)+'', null, null));}
    async getSectionColor(ID) {
/*        ''' Get the color of the selected section in RGB format
        
        Args:
            ID: ID of the section

        Returns:
            Integer
        '''*/
        return parseInt(await this.nfrest('GET', '/section/set/color/'+qt(ID)+'', null, null));}
    async getSectionCutForce(groupName, loadcase, time, type_) {
/*        ''' Get section cut force for the selected section cut, loadcase, time and DoF
        
        Args:
            groupName: Name of section cut group
            loadcase: Loadcase name
            time: For linear analysis, set as 1
            type_: 1=N, 2=Vy, 3=Vz, 4=Mt, 5=My, 6=Mz

        Returns:
            The requested value. 0 if something went wrong.
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/sectioncutforce/'+qt(groupName)+'/'+qt(loadcase)+'/'+qt(time)+'/'+str(type_)+'', null, null));}
    async getSectionFigure(sectionID, figureID, isHole=false) {
/*        ''' Get points in Z-Y plane from a section figure. Typically, index 1 contains the first (filled) figure.
        
        Args:
            sectionID: ID of the section
            figureID: 1-based index of the figure
            isHole (optional): Default false. True if requested figure is a hole

        Returns:
            A 2-dimensional array of double
        '''*/
        return des(await this.nfrest('GET', '/section/figure/'+str(sectionID)+'/'+str(figureID)+'/'+str(isHole)+'', null, null));}
    async getSectionImage(sectionID, titleX='', titleY='', title='', quoteUnits='', quoteFormat='0.00', showAxes=true, showOrigin=0, transparent=false, selectedBar=0) {
/*        ''' Get section plot into an array of Bytes of Png image
        
        Args:
            sectionID: ID of the section
            titleX (optional): Optional title for X axis
            titleY (optional): Optional title for Y axis
            title (optional): Optional graph title
            quoteUnits (optional): Optional. Units of quotes, if set display quotes
            quoteFormat (optional): Optional. Numeric format of quotes
            showAxes (optional): Optional, default true
            showOrigin (optional): Optional, default 0. 1 to show Z and Y arrows, 2 for X and Y arrows
            transparent (optional): Optional, default false. If true, set transparent background
            selectedBar (optional): Optional, default 0. Index of rebar to highlight, 0 to remove highlightning. Set to -1 to remove bars and show section center

        Returns:
            Array of bytes
        '''*/
        return await this.nfrestB('GET', '/op/sectioncalc/imageB/'+str(sectionID)+'/'+qt(titleX)+'/'+qt(titleY)+'/'+qt(title)+'/'+qt(quoteUnits)+'/'+qt(quoteFormat)+'/'+str(showAxes)+'/'+str(showOrigin)+'/'+str(transparent)+'/'+str(selectedBar)+'', null, null)}
    async getSectionLibNames() {
/*        ''' Return an array of string containing section library names from built-in library.
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/sections/libraries', null, null));}
    async getSectionOffset(ID) {
/*        ''' Get the section offset for selected beam element
        
        Args:
            ID: ID of the beam element

        Returns:
            An array of size 2 with offset in z and offset in y local directions. Return null array even if the element is not found
        '''*/
        return des(await this.nfrest('GET', '/section/set/offset/'+qt(ID)+'', null, null));}
    async getSectionProperties(ID) {
/*        ''' Get all properties of a section
        
        Args:
            ID: ID of the section

        Returns:
            A string array with all properties
        '''*/
        return des(await this.nfrest('GET', '/section/props/'+qt(ID)+'', null, null));}
    async getSectionProperty(ID, name) {
/*        ''' Get selected property of a section
        
        Args:
            ID: ID of the section
            name: Name of the property: name, code, type, Lx, Ly, b, h, t, etc.

        Returns:
            A string with the desired property
        '''*/
        return await this.nfrest('GET', '/section/prop/'+qt(ID)+'/'+qt(name)+'', null, null);}
    async getSectionRebarCoords(ID) {
/*        ''' Get rebar coordinates from selected section
        
        Args:
            ID: ID of the section

        Returns:
            Array of X,Y coordinates of size (rebarNumber,2). Coordinates are always referred to the center of reinforcement
        '''*/
        return des(await this.nfrest('GET', '/section/rebar/coords/'+qt(ID)+'', null, null));}
    async getSectionRebarSize(ID) {
/*        ''' Get rebar dimensions from selected section
        
        Args:
            ID: ID of the section

        Returns:
            Array of size of rebar number. All values in mm. Each item starts with Dd with d the diameter for bars, base x height @ rotation for rectangular reinforcements
        '''*/
        return des(await this.nfrest('GET', '/section/rebar/size/'+qt(ID)+'', null, null));}
    async getSectionResDomainPoints(domainIndex, domainType, cleanResponseTolerance=0) {
/*        ''' Get list of points for plotting resisting domain of already computed sections
        
        Args:
            domainIndex: Index of the domain, base 0, returned by getSectionResMoments2, getSectionResMoments3, getSectionResMoments4
            domainType: 0 for Myy vs. Mzz, 1 for N vs. Myy, 2 for N vs. Mzz
            cleanResponseTolerance (optional): Optional, default is 0. Clean points given in N-Mxx domains, to be used only if wrong plot is obtained (e.g. set to 1e-8)

        Returns:
            A list of array of double values, each of size 2 (X,Y)
        '''*/
        return des(await this.nfrest('GET', '/res/check/plotsectiondomain/'+str(domainIndex)+'/'+str(domainType)+'/'+str(cleanResponseTolerance)+'', null, null));}
    async getSectionResMoments(ID, station, calcType, N, Myy, Mzz) {
/*        ''' Get flexural strength of a beam station by calculating neutral axis
        
        Args:
            ID: ID of the element
            station: ID of station, from 1 to 5
            calcType: 0 plastic, 1 elastic, 2 thermal-plastic, 3 thermal-elastic, 4 elastic limit, 5 thermal-elastic limit
            N: Axial force. Positive for tension
            Myy: Moment around vertical section axis
            Mzz: Moment around horizontal section axis

        Returns:
            A string with serialized results in JSON format
        '''*/
        return await this.nfrest('GET', '/op/sectioncalc/a/'+qt(ID)+'/'+str(station)+'/'+str(calcType)+'/'+str(N)+'/'+str(Myy)+'/'+str(Mzz)+'', null, null);}
    async getSectionResMoments(sectionID, materialID, calcType, N, Myy, Mzz) {
/*        ''' Get flexural strength of a section by calculating neutral axis
        
        Args:
            sectionID: ID of the section
            materialID: ID of material
            calcType: 0 plastic, 1 elastic, 2 thermal-plastic, 3 thermal-elastic, 4 elastic limit, 5 thermal-elastic limit
            N: Axial force. Positive for tension
            Myy: Moment around vertical section axis
            Mzz: Moment around horizontal section axis

        Returns:
            A string in JSON format
        '''*/
        return await this.nfrest('GET', '/op/sectioncalc/b/'+qt(sectionID)+'/'+qt(materialID)+'/'+str(calcType)+'/'+str(N)+'/'+str(Myy)+'/'+str(Mzz)+'', null, null);}
    async getSectionResMoments2(sectionID, calcType, N, Mzz, Myy, saveImages='', domainTp=0, options=null, Nserv=0, Mzzserv=0, Myyserv=0) {
/*        ''' Get flexural strength of a section by calculating neutral axis. Material must be set as section property, see setSectionMaterial.
        
        Args:
            sectionID: ID of the section
            calcType: 0 plastic, 1 elastic, 2 thermal-plastic, 3 thermal-elastic, 4 elastic limit, 5 thermal-elastic limit
            N: Axial force. Positive for tension
            Mzz: Moment around vertical section axis
            Myy: Moment around horizontal section axis
            saveImages (optional): Path for saving images of calculated section and domain, in PNG format. Only path a filename is required, no extension.
            domainTp (optional): Optional. Domain type for image: 0 for Myy_Mzz, 1 for N_Myy, 2 for N_Mzz
            options (optional): Optional. Calculation options
            Nserv (optional): Optional. Serviceability axial force. Positive for tension
            Mzzserv (optional): Optional. Serviceability Mzz
            Myyserv (optional): Optional. Serviceability Myy

        Returns:
            An array of strings containing calculation results
        '''*/
        return des(await this.nfrest('GET', '/op/sectioncalc/c/'+str(sectionID)+'/'+str(calcType)+'/'+str(N)+'/'+str(Mzz)+'/'+str(Myy)+'/'+str(domainTp)+'/'+str(Nserv)+'/'+str(Mzzserv)+'/'+str(Myyserv)+'', null, dict([("saveImages",saveImages),("options",options)])));}
    async getSectionResMoments3(sectionID, calcType, N, Mzz, Myy, saveImages='', domainTp=0, options=null, Nserv=0, Mzzserv=0, Myyserv=0) {
/*        ''' Get flexural strength of a section by calculating neutral axis. Material must be set as section property, see setSectionMaterial.
        
        Args:
            sectionID: ID of the section
            calcType: 0 plastic, 1 elastic, 2 thermal-plastic, 3 thermal-elastic, 4 elastic limit, 5 thermal-elastic limit
            N: Axial force. Positive for tension
            Mzz: Moment around vertical section axis
            Myy: Moment around horizontal section axis
            saveImages (optional): Path for saving images of calculated section and domain, in PNG format. Only path a filename is required, no extension.
            domainTp (optional): Optional. Domain type for image: 0 for Myy_Mzz, 1 for N_Myy, 2 for N_Mzz
            options (optional): Optional. Calculation options
            Nserv (optional): Optional. Serviceability axial force. Positive for tension
            Mzzserv (optional): Optional. Serviceability Mzz
            Myyserv (optional): Optional. Serviceability Myy

        Returns:
            A check structure with results
        '''*/
        return await this.nfrest('GET', '/op/sectioncalc/d/'+str(sectionID)+'/'+str(calcType)+'/'+str(N)+'/'+str(Mzz)+'/'+str(Myy)+'/'+str(domainTp)+'/'+str(Nserv)+'/'+str(Mzzserv)+'/'+str(Myyserv)+'', null, dict([("saveImages",saveImages),("options",options)]));}
    async getSectionResShear(sectionID, N=0, Mzz=0, Myy=0, Vy=0, Vz=0) {
/*        ''' Get section shear resistance by automatically selecting checking rules for section material
        
        Args:
            sectionID: ID of the section
            N (optional): Optional. Axial force. Positive for tension
            Mzz (optional): Optional. Moment around vertical section axis
            Myy (optional): Optional. Moment around horizontal section axis
            Vy (optional): Optional. Shear force in y direction
            Vz (optional): Optional. Shear force in z direction

        Returns:
            An array of size 2 with VrdY and VrdZ
        '''*/
        return des(await this.nfrest('GET', '/op/sectioncalc/shear/'+str(sectionID)+'/'+str(N)+'/'+str(Mzz)+'/'+str(Myy)+'/'+str(Vy)+'/'+str(Vz)+'', null, null));}
    async getSectionResShear(sectionID, verName, N=0, Mzz=0, Myy=0, Vy=0, Vz=0) {
/*        ''' Get section shear resistance
        
        Args:
            sectionID: ID of the section
            verName: Name of the checking to be used
            N (optional): Optional. Axial force. Positive for tension
            Mzz (optional): Optional. Moment around vertical section axis
            Myy (optional): Optional. Moment around horizontal section axis
            Vy (optional): Optional. Shear force in y direction
            Vz (optional): Optional. Shear force in z direction

        Returns:
            An array of size 2 with VrdY and VrdZ
        '''*/
        return des(await this.nfrest('GET', '/op/sectioncalc/shear/'+str(sectionID)+'/'+qt(verName)+'/'+str(N)+'/'+str(Mzz)+'/'+str(Myy)+'/'+str(Vy)+'/'+str(Vz)+'', null, null));}
    async getSectionResShearDict(sectionID, verName, N=0, Mzz=0, Myy=0, Vy=0, Vz=0, overrideValues=null) {
/*        ''' Get section shear resistance
        
        Args:
            sectionID: ID of the section
            verName: Name of the checking to be used. See getCheckNameByMaterial to get it automatically
            N (optional): Optional. Axial force. Positive for tension
            Mzz (optional): Optional. Moment around vertical section axis
            Myy (optional): Optional. Moment around horizontal section axis
            Vy (optional): Optional. Shear force in y direction
            Vz (optional): Optional. Shear force in z direction
            overrideValues (optional): Optional dictionary of {string, double} containing overrides for checking (e.g. ctgtheta = 1 for concrete)

        Returns:
            A dictionary of {string, double} containing all the results from calculation
        '''*/
        return des(await this.nfrest('POST', '/op/sectioncalc/shear2/'+str(sectionID)+'/'+qt(verName)+'/'+str(N)+'/'+str(Mzz)+'/'+str(Myy)+'/'+str(Vy)+'/'+str(Vz)+'', overrideValues, null));}
    async getSectionsLibrary(filter='') {
/*        ''' Return an array of string containing section names from built-in library.
        
        Args:
            filter (optional): Optional. String supporting wildcards for material name

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/sections/library/'+qt(filter)+'', null, null));}
    async getSectionsLibraryF(filename, filter='') {
/*        ''' Return an array of string containing section names from built-in library.
        
        Args:
            filename: Name of the nfs library, without extension
            filter (optional): Optional. String supporting wildcards for material name

        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/sections/libraryf/'+qt(filename)+'/'+qt(filter)+'', null, null));}
    async getSectMomentCurvature(sectionID, N, Mzz, Myy, npts=20, Nserv=0, Mzzserv=0, Myyserv=0) {
/*        ''' Get moment-curvature diagram for the selected section
        
        Args:
            sectionID: ID of the section
            N: Axial force. Positive for tension
            Mzz: Moment around vertical section axis
            Myy: Moment around horizontal section axis
            npts (optional): Optional. Number of curve points. Default 20
            Nserv (optional): Optional. Serviceability axial force. Positive for tension
            Mzzserv (optional): Optional. Serviceability Mzz
            Myyserv (optional): Optional. Serviceability Myy

        Returns:
            A list of arrays of double (size 2) with resisting moment vs. curvature (1/units of length)
        '''*/
        return des(await this.nfrest('GET', '/op/sectioncalc/momentcurvature/'+str(sectionID)+'/'+str(N)+'/'+str(Mzz)+'/'+str(Myy)+'/'+str(npts)+'/'+str(Nserv)+'/'+str(Mzzserv)+'/'+str(Myyserv)+'', null, null));}
    async getSeparator() {
/*        ''' Returns separator used by the program
        
        
        Returns:
            String value
        '''*/
        return await this.nfrest('GET', '/op/sep', null, null);}
    async getShearResFromDict(dict_) {
/*        ''' Get section shear resistance from an already performed checking given in a dictionary of string, double
        
        Args:
            dict_: Dictionary of string, double of an already performed checking

        Returns:
            An array of size 2 with VrdY and VrdZ
        '''*/
        return des(await this.nfrest('POST', '/op/sectioncalc/shearres', dict, null));}
    async getShearResFromDict(dict_) {
/*        ''' Get section shear resistance from an already performed checking given in a dictionary of string, double
        
        Args:
            dict_: Dictionary of string, double of an already performed checking

        Returns:
            An array of size 2 with VrdY and VrdZ
        '''*/
        return des(await this.nfrest('POST', '/op/sectioncalc/shearres', dict, null));}
    async getShellEndRelease(ID) {
/*        ''' Give shell releases
        
        Args:
            ID: ID of the shell. Tria and Quad only

        Returns:
            Matrix of boolean of size [n,6], where n is the number of nodes. 6 boolean values for each node (fx, fy, fz, mx, my, drilling)
        '''*/
        return des(await this.nfrest('GET', '/element/shellendrelease/'+qt(ID)+'', null, null));}
    async getSoilPressureAtNode(node, loadcase, time='1') {
/*        ''' Return the soil pressure (positive if compression on soil) in Z global direction
        
        Args:
            node: Reference node
            loadcase: Name of the loadcase
            time (optional): Optional, time of result, default is 1

        Returns:
            Double value
        '''*/
        return parseFloat(await this.nfrest('GET', '/res/soilpressureatnode/'+qt(node)+'/'+qt(loadcase)+'/'+qt(time)+'', null, null));}
    async getSpringLocalAxes(elem) {
/*        ''' Get local axes of a spring element
        
        Args:
            elem: Spring element number

        Returns:
            Array of double of size 9, empty if error occurs
        '''*/
        return des(await this.nfrest('GET', '/springproperty/axes/'+qt(elem)+'', null, null));}
    async getSpringProperties() {
/*        ''' Get a list of spring properties defined in the model
        
        
        Returns:
            Array of spring properties. For each line: ID kX kY kZ krX krY krZ Elastic_soil Winkler_modulus
        '''*/
        return des(await this.nfrest('GET', '/springproperty/list', null, null));}
    async getStaticLoadCases() {
/*        ''' Get the names of static analysis loadcases set in the model.
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/loadcases/static', null, null));}
    async getStoreyStiffnessTable(lc) {
/*        ''' Get the storey stiffness table for a given loadcase
        
        Args:
            lc: Name of the loadcase that contains a set of lateral forces, for each storey

        Returns:
            Storey stiffness table as a list of list of string
        '''*/
        return des(await this.nfrest('GET', '/model/storeystiff/'+qt(lc)+'', null, null));}
    async getSubsoilElements() {
/*        ''' Get a list of elements having subsoil springs
        
        
        Returns:
            An array of element IDs
        '''*/
        return des(await this.nfrest('GET', '/element/add/subsoil', null, null));}
    async getTimePeriods(lc) {
/*        ''' Returns time/period values in results for the desired loadcase
        
        Args:
            lc: The desired loadcase

        Returns:
            Return nothing if empty results
        '''*/
        return des(await this.nfrest('GET', '/res/periods/'+qt(lc)+'', null, null));}
    async getTotalMass(selectedNodes=null) {
/*        ''' Return the total mass of the model, or of the selected nodes
        
        Args:
            selectedNodes (optional): Array of selected node IDs

        Returns:
            Array in form (Mx,My,Mz,Ix,Iy,Iz)
        '''*/
        return des(await this.nfrest('POST', '/model/totalmass', selectedNodes, null));}
    async getUserViews() {
/*        ''' Get a list of names of user-defined model views
        
        
        Returns:
            An array of strings
        '''*/
        return des(await this.nfrest('GET', '/model/userviews', null, null));}
    async getVersion() {
/*        ''' Get API version
        
        
        Returns:
            A decimal containing the version. Eg. 1.52 stands for v1.5, patch 2
        '''*/
        return parseFloat(await this.nfrest('GET', '/version', null, null));}
    async getWallGroups() {
/*        ''' Return all the groups than can be associated to a wall
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/element/walls/list', null, null));}
    async getWallHeight(grpName) {
/*        ''' Gives the height of a specified wall
        
        Args:
            grpName: Name of wall group

        Returns:
            Double value
        '''*/
        return parseFloat(await this.nfrest('GET', '/element/walls/height/'+qt(grpName)+'', null, null));}
    async getWalls() {
/*        ''' Return all the wall elements by their number
        
        
        Returns:
            Array of strings
        '''*/
        return des(await this.nfrest('GET', '/element/walls/elems', null, null));}
    async getWallSection(grpName) {
/*        ''' Gives the dimensions (thickness and width) of a specified wall
        
        Args:
            grpName: Name of wall group

        Returns:
            Array of float with thickness and width
        '''*/
        return des(await this.nfrest('GET', '/element/walls/section/'+qt(grpName)+'', null, null));}
    async hasResults(loadcase='') {
/*        ''' Flag indicating if model has results
        
        Args:
            loadcase (optional): Optional. Loadcase for results

        Returns:
            A boolean flag, True if any kind of result is present
        '''*/
        return sbool(await this.nfrest('GET', '/res', null, dict([("lc",loadcase)])));}
    async importAbaqusCalculix(path) {
/*        ''' Import ABAQUS/CalculiX model
        
        Args:
            path: Full path of INP file

        Returns:
            Always true
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/abaqus', null, dict([("path",path)])));}
    async importDolmen(path) {
/*        ''' Import a CDM Dolmen model
        
        Args:
            path: Full path of STR file

        Returns:
            True if results have been read, only if .bin results are in the same folder
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/dolmen', null, dict([("path",path)])));}
    async importDXF(path) {
/*        ''' Import DXF file
        
        Args:
            path: Path of DXF file to be imported

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/dxf', null, dict([("path",path)])));}
    async importDXF(stream) {
/*        ''' Import DXF from stream
        
        Args:
            stream: Stream to be imported

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('POST', '/op/import/dxfstream', stream, null));}
    async importGMesh(path) {
/*        ''' Import a text GMesh v2 file
        
        Args:
            path: Full path of GMesh file

        Returns:
            False in case of error or GeneralDesign license missing
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/gmesh', null, dict([("path",path)])));}
    async importIFC(path, includeRigidLinks=false) {
/*        ''' Import IFC file
        
        Args:
            path: Full path of the IFC file
            includeRigidLinks (optional): False is default. True to read rigid links from structural models

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/ifc/'+str(includeRigidLinks)+'', null, dict([("path",path)])));}
    async importMesh(path) {
/*        ''' Import a text Mesh file from off2msh format (MeshVersionFormatted 1) or neutral
        
        Args:
            path: Full path of Mesh file

        Returns:
            False in case of error or GeneralDesign license missing
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/mesh', null, dict([("path",path)])));}
    async importMidas(path) {
/*        ''' Import a Midas GEN/Civil model in text format
        
        Args:
            path: Full path of MGT/MCT file

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/midasfile', null, dict([("path",path)])));}
    async importMidas(model) {
/*        ''' Import a Midas GEN/Civil model in text format
        
        Args:
            model: Array of model lines

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('POST', '/op/import/midastext', model, null));}
    async importMidasResults(path) {
/*        ''' Read results from Midas GEN/Civil tables, copied to a text file
        
        Args:
            path: Full path of results file

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/midasresult', null, dict([("path",path)])));}
    async importMidasResults(text) {
/*        ''' Read results from Midas GEN/Civil tables, copied to a text file
        
        Args:
            text: Array of strings

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('POST', '/op/import/midasresulttext', text, null));}
    async importMidasResultsAPI(MAPIkey, resultsToImport) {
/*        ''' Import Midas results from Midas GEN NX/Civil NX API
        
        Args:
            MAPIkey: Required, get it from your running Midas program
            resultsToImport: Array of boolean to select results to import: ["Beam forces", "Truss forces", "Displacements", "RS forces", "Wall forces", "Elastic link forces", "Plate local forces"]

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/op/import/midasresultapi', resultsToImport, dict([("mapi",MAPIkey)])));}
    async importNodeElemFiles(path) {
/*        ''' Import a node/elem set of file
        
        Args:
            path: Path of .node or .elem file

        Returns:
            
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/nodeelem', null, dict([("path",path)])));}
    async importOBJ(path) {
/*        ''' Import text OBJ file
        
        Args:
            path: Full path of OBJ file

        Returns:
            
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/obj', null, dict([("path",path)])));}
    async importOpenSees(path) {
/*        ''' Import OpenSees model in TCL format
        
        Args:
            path: Full path of TCL file

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/opensees', null, dict([("path",path)])));}
    async importOpenSeesRecorder(path, type_, useTimeFlag=true) {
/*        ''' Import an OpenSees recorder text file. XML is also supported.
        
        Args:
            path: Full path of results file
            type_: Type of result: 1-displacements 2-reactions 3-eigenvectors 4-accelerations 5-forces
            useTimeFlag (optional): Set to true if -time flag has been used in the recorder setting

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/recorder/'+str(type_)+'/'+str(useTimeFlag)+'', null, dict([("path",path)])));}
    async importSAF(path) {
/*        ''' Import structural model in SAF file
        
        Args:
            path: Full path of SAF .xlsx file

        Returns:
            True if results have been read
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/saf', null, dict([("path",path)])));}
    async importSAP2000(path) {
/*        ''' Import a SAP2000 model in text format
        
        Args:
            path: Full path of S2K file

        Returns:
            True if results are present
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/sap2000', null, dict([("path",path)])));}
    async importSeismoStruct(path) {
/*        ''' Import a SeismoStruct XML model
        
        Args:
            path: Full path of XML file

        Returns:
            True if results have been read, only if .out file is in the same folder
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/seismostruct', null, dict([("path",path)])));}
    async importSismicad(path, lenUnit='cm', forceUnit='daN') {
/*        ''' Import a Sismicad model. Consider to call importSismicadSects_Combo to read sections and combinations before calling this function.
        
        Args:
            path: Full path of Sismicad 90static.F3F/F2F file
            lenUnit (optional): Optional length units to be provided, default is cm
            forceUnit (optional): Optional force unit to be provided, default is daN

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/sismicad'+qt(lenUnit)+'/'+qt(forceUnit)+'', null, dict([("path",path)])));}
    async importSismicadSects_Combo(path) {
/*        ''' Read section definitions and combinations from Sismicad tables, in TXT format
        
        Args:
            path: Full path of TXT file

        Returns:
            Always true
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/sismicadset', null, dict([("path",path)])));}
    async importSismicadSects_Combo(text) {
/*        ''' Read section definitions and combinations from Sismicad tables, in TXT format
        
        Args:
            text: Array of strings

        Returns:
            True if at least one loadcase or combination is read
        '''*/
        return sbool(await this.nfrest('POST', '/op/import/sismicadsettext', text, null));}
    async importSofistik(path) {
/*        ''' Import a Sofistik model from database
        
        Args:
            path: Full path of CDB file

        Returns:
            True if results have been read
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/sofistik', null, dict([("path",path)])));}
    async importSR3(path) {
/*        ''' Import a OpenSargon model in binary format
        
        Args:
            path: Full path of OpenSargon SR3 file

        Returns:
            True if results have been read, only if .sdb file is in the same folder
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/sr3', null, dict([("path",path)])));}
    async importSR4(path) {
/*        ''' Import a OpenSargon model in text format
        
        Args:
            path: Full path of OpenSargon SR4 file

        Returns:
            True if results have been read
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/sr4', null, dict([("path",path)])));}
    async importSTL(path) {
/*        ''' Import text or binary STL file
        
        Args:
            path: Full path of STL file

        Returns:
            
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/stl', null, dict([("path",path)])));}
    async importStraus7(path) {
/*        ''' Import a Straus7 model in text format
        
        Args:
            path: Full path of Straus7 TXT file

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/straus7', null, dict([("path",path)])));}
    async importStrausResults(path) {
/*        ''' Read results from Straus7 tables, copied to a text file
        
        Args:
            path: Full path of results file

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/straus7result', null, dict([("path",path)])));}
    async importStrausResults(text) {
/*        ''' Read results from Straus7 tables, copied to a text file
        
        Args:
            text: Array of strings

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('POST', '/op/import/straus7resulttext', text, null));}
    async importWinStrand(path) {
/*        ''' Import a EnExSys WinStrand model in XML format
        
        Args:
            path: Full path of XML file

        Returns:
            True if results have been read
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/winstrand', null, dict([("path",path)])));}
    async importZeusNL(path) {
/*        ''' Import a Zeus-NL/ADAPTIC model
        
        Args:
            path: Full path of Zeus-NL/ADAPTIC model file

        Returns:
            
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/zeusnl', null, dict([("path",path)])));}
    async importZeusNLresults(path) {
/*        ''' Import results from Zeus-NL/ADAPTIC .num file
        
        Args:
            path: Full path of Zeus-NL/ADAPTIC .num file

        Returns:
            
        '''*/
        return sbool(await this.nfrest('GET', '/op/import/zeusnlres', null, dict([("path",path)])));}
    async is64bit() {
/*        ''' Check if running program is at 64bit
        
        
        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/is64bit', null, null));}
    async isColumn(beamID) {
/*        ''' Check if a beam element is vertical or not
        
        Args:
            beamID: ID of the beam element to check

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/element/iscolumn/'+qt(beamID)+'', null, null));}
    async isNodeLoaded(node) {
/*        ''' Tell if the node is loaded or not
        
        Args:
            node: ID of the node

        Returns:
            True if almost one nodal load has been found
        '''*/
        return sbool(await this.nfrest('GET', '/load/node/isloaded/'+qt(node)+'', null, null));}
    async isRestrained(node) {
/*        ''' Tell if the node is restrained or not
        
        Args:
            node: ID of the node

        Returns:
            True if almost one dof is restrained
        '''*/
        return sbool(await this.nfrest('GET', '/bc/node/'+qt(node)+'', null, null));}
    async LangTrasl(input) {
/*        ''' Return a translation of the input string depending on the current locale.
        
        Args:
            input: 

        Returns:
            
        '''*/
        return await this.nfrest('POST', '/op/trasl', input, null);}
    async LaunchLoadCase(loadcase, outOfProc=false, noWindow=false) {
/*        ''' Launch a single loadcase calculation, not waiting for finishing
        
        Args:
            loadcase: The loadcase name to run
            outOfProc (optional): If true, run the model out of process
            noWindow (optional): If true, hide the solver window or its output lines from console. Applicable only if out of process is active

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/op/launchlc/'+qt(loadcase)+'/'+str(outOfProc)+'/'+str(noWindow)+'', null, null));}
    async LaunchModel(outOfProc=false, noWindow=false) {
/*        ''' Launch entire model calculation, not waiting for finishing
        
        Args:
            outOfProc (optional): If true, run the model out of process
            noWindow (optional): If true, hide the solver window or its output lines from console. Applicable only if out of process is active

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/op/launchmodel/'+str(outOfProc)+'/'+str(noWindow)+'', null, null));}
    async listDesignMaterialCustomProperty(ID) {
/*        ''' Get a list of the custom properties stored in the selected design material
        
        Args:
            ID: ID of the material

        Returns:
            Array of string with custom properties names. Use getDesignMaterialProperty method to get values.
        '''*/
        return des(await this.nfrest('GET', '/designmaterial/proplist/'+str(ID)+'', null, null));}
    async listMaterialCustomProperty(ID) {
/*        ''' Get a list of the custom properties stored in the selected material
        
        Args:
            ID: ID of the material

        Returns:
            Array of string with custom properties names. Use getMaterialProperty method to get values.
        '''*/
        return des(await this.nfrest('GET', '/material/proplist/'+str(ID)+'', null, null));}
    async LoadCaseFromCombo(comboName) {
/*        ''' Generates a load-case from a linear add combination.
        
        Args:
            comboName: 

        Returns:
            The name of the new loadcase created
        '''*/
        return await this.nfrest('GET', '/loadcase/fromcombo/'+qt(comboName)+'', null, null);}
    async mergeImportedLines(lineIDs) {
/*        ''' Merge selected Line elements with imported results
        
        Args:
            lineIDs: Array of Lines to be merged

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/mergeimportedlines', null, dict([("lines",JSON.stringify(lineIDs))])));}
    async mergeLines(lineIDs) {
/*        ''' Merge selected Line elements
        
        Args:
            lineIDs: Array of Lines to be merged

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/mergelines', null, dict([("lines",JSON.stringify(lineIDs))])));}
    async mergeModelData(modeldata) {
/*        ''' Merge a new model to the existing one
        
        Args:
            modeldata: Model in JSON format

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('PUT', '/model/data'+qt(modeldata)+'', null, null));}
    async mergeModelResults(modelresults) {
/*        ''' Merge a new set of results to the existing ones
        
        Args:
            modelresults: Results in JSON format

        Returns:
            
        '''*/
        return sbool(await this.nfrest('PUT', '/model/results'+qt(modelresults)+'', null, null));}
    async mergeOverlappedNodes() {
/*        ''' Merge overlapped nodes in the model
        
        
        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/mergenodes', null, null));}
    async meshAreaTria(filledContour, emptyContour, maxTriaArea, useAllNodes=false, belt=0, useQuad=false, minAngle=20) {
/*        ''' Mesh a planar area with triangular or quadrilateral elements
        
        Args:
            filledContour: List of nodes defining the filled part
            emptyContour: List of nodes defining holes
            maxTriaArea: Maximum area for each triangular element
            useAllNodes (optional): Optional. Include internal nodes in mesh - only for convex regions
            belt (optional): Optional. Size of the optional belt, external to the convex polygon
            useQuad (optional): Optional. Use Quad where possible. Not recommended, as can generate degenerated quad elements
            minAngle (optional): Optional. Mininum angle in degrees for triangles generation, default is 20°

        Returns:
            An array containing the IDs of newly created Tria elements
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/tria/'+str(maxTriaArea)+'/'+str(useAllNodes)+'/'+str(belt)+'/'+str(useQuad)+'/'+str(minAngle)+'', null, dict([("filled",JSON.stringify(filledContour)),("empty",JSON.stringify(emptyContour))])));}
    async meshAreaTriaMulti(filledContour, emptyContour, maxTriaArea, useAllNodes=false, belt=0, useQuad=false, minAngle=20) {
/*        ''' Mesh planar areas with triangular or quadrilateral elements. This function has to be used when defined more than one hole per meshed region.
        
        Args:
            filledContour: List of array of nodes defining the filled part
            emptyContour: List of array of nodes defining holes
            maxTriaArea: Maximum area for each triangular element
            useAllNodes (optional): Optional. Include internal nodes in mesh - only for convex regions
            belt (optional): Optional. Size of the optional belt, external to the convex polygon
            useQuad (optional): Optional. Use Quad where possible. Not recommended, as can generate degenerated quad elements
            minAngle (optional): Optional. Mininum angle in degrees for triangles generation, default is 20°

        Returns:
            An array containing the IDs of newly created Tria elements
        '''*/
        return des(await this.nfrest('GET', '/op/mesh/triamulti/'+str(maxTriaArea)+'/'+str(useAllNodes)+'/'+str(belt)+'/'+str(useQuad)+'/'+str(minAngle)+'', null, dict([("filled",JSON.stringify(filledContour)),("empty",JSON.stringify(emptyContour))])));}
    async meshQuad2Wall(quadIDs, isHorizontal=false) {
/*        ''' Mesh and group into wall a single quad element.
        
        Args:
            quadIDs: List of ID of the quads to mesh.
            isHorizontal (optional): Set to true to create vertical section cuts. If omitted or set to false, vertical wall is assumed.

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/quad2wall/'+str(isHorizontal)+'', null, dict([("quadIDs",JSON.stringify(quadIDs))])));}
    async ModelToSection(openModelPath='') {
/*        ''' Write a section from a thermal model made with planar elements
        
        Args:
            openModelPath (optional): Optional. Path of the model to read, otherwise the current model is used

        Returns:
            ID of the newly added section
        '''*/
        return await this.nfrest('GET', '/model/model2section', null, dict([("path",openModelPath)]));}
    async moveNodes(nodes, displX, displY, displZ, absolutePosition=false) {
/*        ''' Move nodes
        
        Args:
            nodes: Array of nodes ID to be rotated
            displX: Displacement in X direction
            displY: Displacement in Y direction
            displZ: Displacement in Z direction
            absolutePosition (optional): Optional. True if previous parameters indicate absolute position in space

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/movenodes/'+str(displX)+'/'+str(displY)+'/'+str(displZ)+'/'+str(absolutePosition)+'', null, dict([("nodes",JSON.stringify(nodes))])));}
    async newModel() {
/*        ''' Clear model
        
        
        Returns:
            
        '''*/
        return await this.nfrest('GET', '/op/new', null, null);}
    async openIDEAcodeCheck() {
/*        ''' Open IDEA CheckBot, if installed. Only for local instances of NextFEM Designer
        
        
        Returns:
            
        '''*/
        return await this.nfrest('GET', '/op/export/ccm', null, null);}
    async openModel(filename) {
/*        ''' Open the specified NXF or XML model
        
        Args:
            filename: Path to the model

        Returns:
            True if opening has been successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/open', null, dict([("path",filename)])));}
    async quad2tria(elem) {
/*        ''' Transform a quad element into 2 tria elements
        
        Args:
            elem: ID of the quad element

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/quad2tria/'+qt(elem)+'', null, null));}
    async readBeamForces(num, loadcase, time, N, Vy, Vz, Mt, Myy, Mzz, pos) {
/*        ''' Add a beam forces set to results.
        
        Args:
            num: ID of the beam element
            loadcase: Loadcase to filled
            time: Time. For linear analyses, use 1.
            N: Axial force
            Vy: Shear force in y local axis
            Vz: Shear force in z local axis
            Mt: Twisting moment
            Myy: Bending moment around y axis
            Mzz: Bending moment around z axis
            pos: Distance from the beginning of the beam to the station specified

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/res/import/beamforces/'+qt(num)+'/'+qt(loadcase)+'/'+qt(time)+'/'+str(N)+'/'+str(Vy)+'/'+str(Vz)+'/'+str(Mt)+'/'+str(Myy)+'/'+str(Mzz)+'/'+str(pos)+'', null, null));}
    async recalculateSection(ID) {
/*        ''' Recalculate section properties, if needed
        
        Args:
            ID: ID of the section

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/recalc/'+str(ID)+'', null, null));}
    async reDo() {
/*        ''' Redo the last undone operation.
        
        
        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/redo', null, null));}
    async refreshDesignerView(vstate=0, resize=false) {
/*        ''' Refresh view of the remote connected instance of NextFEM Designer. Valid only after connect() command.
        
        Args:
            vstate (optional): Optional. Int value from ViewState enumerator, default is Reset (0): (0) Reset, (1) NoOperation, 
 (2) NodesVisible, (3) NodesNumber, (4) ElementsNumber, (5) ExtrudedView, (6) ColorElements_Uniform, (7) ColorElements_BySection, 
 (8) ColorElements_ByMaterial, (9) ColorElements_ByGroup, (10) ShowLocalAxes, (11) GetScreenshot, (12) ShowAllLoads, 
 (13) ShowDisplResults, (14) HighlightSelectedNodes, (15) HighlightSelectedElems, (16) ClearNodesHighlight, 
 (17) ClearElementsHighlight, (18) ShowNodesCheckResults, (19) ShowElementsCheckResults, (20) ShowFrameForcesResults, 
 (21) ShowFrameForcesResultsN, (22) ShowFrameForcesResultsVy, (23) ShowFrameForcesResultsVz, (24) ShowFrameForcesResultsT, 
 (25) ShowFrameForcesResultsMy, (26) ShowFrameForcesResultsMz, (27) ShowReactionsResults, (28) ShowReactionsResultsRX, 
 (29) ShowReactionsResultsRY, (30) ShowReactionsResultsRZ, (31) ShowReactionsResultsRrX, (32) ShowReactionsResultsRrY, 
 (33) ShowReactionsResultsRrZ, (34) ShowAreaForcesResults, (35) ShowAreaForcesResultsFxx, (36) ShowAreaForcesResultsFyy, 
 (37) ShowAreaForcesResultsFxy, (38) ShowAreaForcesResultsMxx, (39) ShowAreaForcesResultsMyy, 
 (40) ShowAreaForcesResultsMxy, (41) ShowAreaForcesResultsQxz, (42) ShowAreaForcesResultsQyz, 
 (43) ShowAreaForcesResultsMxWAbot, (44) ShowAreaForcesResultsMyWAbot, (45) ShowAreaForcesResultsMxWAtop, 
 (46) ShowAreaForcesResultsMyWAtop, (47) ShowAreaForcesResultsMxWA, (48) ShowAreaForcesResultsMyWA, 
 (49) ShowSoilPressure, (50) ApplyColors, (51) ShowSelectionOnly, (52) HideSelection, (53) ShowAll, (54) FitView, 
 (55) UserView
            resize (optional): Optional, default to false (no view resize)

        Returns:
            
        '''*/
        return await this.nfrest('GET', '/op/view/'+str(vstate)+'/'+str(resize)+'', null, null);}
    async refreshHinges() {
/*        ''' Recalculate all hinges assigned in the model. Useful after modification of material or section.
        
        
        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/hinge/refresh', null, null));}
    async removeAllLoads() {
/*        ''' Removes all the loads in the model
        
        
        Returns:
            True if successful, False otherwise
        '''*/
        return sbool(await this.nfrest('DELETE', '/load/all', null, null));}
    async removeAllLoadsForLoadcase(lc) {
/*        ''' Removes all the loads in the model for the selected loadcase
        
        Args:
            lc: Name of the loadcase

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('DELETE', '/load/alllc/'+qt(lc)+'', null, null));}
    async removeBC(node) {
/*        ''' Remove boundary condition for a node
        
        Args:
            node: Node ID

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('DELETE', '/bc/'+qt(node)+'', null, null));}
    async removeCompositeFlags(ID) {
/*        ''' Remove flags for composite section
        
        Args:
            ID: ID of the section

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/set/removecomposite/'+str(ID)+'', null, null));}
    async removeCustomData(key) {
/*        ''' Remove a custom data field from the model
        
        Args:
            key: Key, must be unique

        Returns:
            True if successful, False is the key was not present
        '''*/
        return sbool(await this.nfrest('DELETE', '/model/customdata/'+qt(key)+'', null, null));}
    async removeDesMaterialProperty(ID, name) {
/*        ''' Remove a custom property from the selected design material
        
        Args:
            ID: ID of the design material
            name: Name of the property

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/designmaterial/prop/'+str(ID)+'/'+qt(name)+'', null, null));}
    async removeDrawing(name) {
/*        ''' Remove the selected drawing from the model
        
        Args:
            name: Name of the construction drawing

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/model/drawing/'+qt(name)+'', null, null));}
    async removeElement(ID) {
/*        ''' Remove the specified element from the model
        
        Args:
            ID: ID of the element to be removed

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/element/'+qt(ID)+'', null, null));}
    async removeElementsFromMember(member, elems) {
/*        ''' Remove the specified elements from a member
        
        Args:
            member: Member ID
            elems: IDs of elements to be removed

        Returns:
            True if successful, False otherwise
        '''*/
        return sbool(await this.nfrest('DELETE', '/model/member/elems/'+qt(member)+'', null, dict([("elems",JSON.stringify(elems))])));}
    async removeFloorLoad(name) {
/*        ''' Remove the specified floor load type
        
        Args:
            name: 

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/load/floor/remove/'+qt(name)+'', null, null));}
    async removeFloorPlane(name) {
/*        ''' Remove a floor plane specified by its name
        
        Args:
            name: 

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/load/floor/planeremove/'+qt(name)+'', null, null));}
    async removeFreeNodes() {
/*        ''' Find and remove free nodes in the model
        
        
        Returns:
            True
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/removefreenodes', null, null));}
    async removeHinges(beamID) {
/*        ''' Remove all hinges from a beam element
        
        Args:
            beamID: ID of the beam element

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/hinge/remove/'+qt(beamID)+'', null, null));}
    async removeHingeType(name) {
/*        ''' Remove hinge property
        
        Args:
            name: Name of the hinge property

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/hinge/removetype/'+qt(name)+'', null, null));}
    async removeLink(node) {
/*        ''' Removes a rigid link from the model.
        
        Args:
            node: ID of the slave node.

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/op/mesh/constraint/'+qt(node)+'', null, null));}
    async removeLoad(ID) {
/*        ''' Removes the specified load.
        
        Args:
            ID: ID of the load to be removed, starting from 0.

        Returns:
            True if successful, False otherwise
        '''*/
        return sbool(await this.nfrest('DELETE', '/load/'+str(ID)+'', null, null));}
    async removeLoadCase(name) {
/*        ''' Remove the specified loacase
        
        Args:
            name: Name of the loadcase

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/loadcase/'+qt(name)+'', null, null));}
    async removeLoadCaseFromCombination(name, loadcase) {
/*        ''' Remove loadcase and factor from an already existing combination, buckling or PDelta analysis
        
        Args:
            name: Name of the combination or buckling analysis
            loadcase: Name of the loadcase to be removed

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/combo/remove/'+qt(name)+'/'+qt(loadcase)+'', null, null));}
    async removeLoadCaseToTimeHistoryAnalysis(name, loadcase) {
/*        ''' Remove loadcase and factor to an already existing time-history analysis
        
        Args:
            name: Name of the time-history analysis
            loadcase: Name of the loadcase to be removed

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/combo/removeth/'+qt(name)+'/'+qt(loadcase)+'', null, null));}
    async removeMaterial(materialID) {
/*        ''' Remove the selected material
        
        Args:
            materialID: ID of the material

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/material/remove/'+str(materialID)+'', null, null));}
    async removeMaterialProperty(ID, name) {
/*        ''' Remove a custom property from the selected material
        
        Args:
            ID: ID of the material
            name: Name of the property

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/material/prop/'+str(ID)+'/'+qt(name)+'', null, null));}
    async removeMember(member) {
/*        ''' Remove a member from the model
        
        Args:
            member: Member ID

        Returns:
            True if successful, False otherwise
        '''*/
        return sbool(await this.nfrest('GET', '/model/member/remove/'+qt(member)+'', null, null));}
    async removeNodalMass(ID) {
/*        ''' Remove all masses defined in a node
        
        Args:
            ID: ID of the node hosting the masses

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/mass/remove/'+qt(ID)+'', null, null));}
    async removeNode(ID) {
/*        ''' Remove the node with the specified ID from the model
        
        Args:
            ID: ID of the node to be removed

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/node/'+qt(ID)+'', null, null));}
    async removeNodeCS(num) {
/*        ''' Remove a previously defined Local Coordinate System from a node.
        
        Args:
            num: Node number

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/node/cs/'+qt(num)+'', null, null));}
    async removeOverlappedElements(tol=-1) {
/*        ''' Find and remove overlapped elements in the model, handling members and groups
        
        Args:
            tol (optional): Optional parameter for tolerance

        Returns:
            True
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/removeoverlappedelements'+str(tol)+'', null, null));}
    async removeRigidDiaphragms() {
/*        ''' Remove all the rigid floor constraints in the model.
        
        
        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/op/mesh/rigiddiaph', null, null));}
    async removeSection(sectionID) {
/*        ''' Remove the selected section
        
        Args:
            sectionID: ID of the section

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/remove/'+str(sectionID)+'', null, null));}
    async removeSectionCover(sectionID) {
/*        ''' Remove section cover
        
        Args:
            sectionID: ID of the section

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('DELETE', '/section/add/cover/'+str(sectionID)+'', null, null));}
    async removeSectionFigure(sectionID, figureID, isEmpty=false) {
/*        ''' Remove a figure from the selected section
        
        Args:
            sectionID: ID of the section
            figureID: 1-based index of the figure to remove
            isEmpty (optional): Optional, True if the figure is a hole

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/add/removefigure/'+str(sectionID)+'/'+str(figureID)+'/'+str(isEmpty)+'', null, null));}
    async removeSectionProperty(ID, name) {
/*        ''' Revert a previously custom section property to automatic evaluation
        
        Args:
            ID: ID of the section
            name: Name of the native property: Area, Jxc, Jyc, Jxyc, Jt, Iw, shAreaX, shAreaY, or custom value to be removed

        Returns:
            True if property has been reverted to automatic evaluation or custom prop. has been removed
        '''*/
        return sbool(await this.nfrest('DELETE', '/section/prop/'+qt(ID)+'/'+qt(name)+'', null, null));}
    async removeSpringProperty(name) {
/*        ''' Remove a linear or non-linear spring property
        
        Args:
            name: Name of the property set

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('DELETE', '/springproperty/'+qt(name)+'', null, null));}
    async renameSection(sectionID, name, code='') {
/*        ''' Assign name to an already defined section
        
        Args:
            sectionID: ID of the section
            name: Name of the section
            code (optional): Reference code

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/section/rename/'+str(sectionID)+'/'+qt(name)+'/'+qt(code)+'', null, null));}
    async renumberElements(initialID, step) {
/*        ''' Renumber elements in the model
        
        Args:
            initialID: ID for 1st element, must be > 0
            step: Increment in numbering

        Returns:
            True if renumbering has been applied, false otherwise
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/renumber/elements/'+str(initialID)+'/'+str(step)+'', null, null));}
    async renumberElementsByCoordinates(dir1, dir2) {
/*        ''' Renumber elements in the model with spatial criteria, using element centroid
        
        Args:
            dir1: Index of first criterium: 1 by X, 2 by Y, 3 by Z
            dir2: Index of second criterium: 1 by X, 2 by Y, 3 by Z

        Returns:
            True if renumbering has been applied, false otherwise
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/renumber/elementsbycoords/'+str(dir1)+'/'+str(dir2)+'', null, null));}
    async renumberNodes(initialID, step) {
/*        ''' Renumber nodes in the model
        
        Args:
            initialID: ID for 1st node, must be > 0
            step: Increment in numbering

        Returns:
            True if renumbering has been applied, false otherwise
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/renumber/nodes/'+str(initialID)+'/'+str(step)+'', null, null));}
    async renumberNodesByCoordinates(dir1, dir2) {
/*        ''' Renumber nodes in the model with spatial criteria
        
        Args:
            dir1: Index of first criterium: 1 by X, 2 by Y, 3 by Z
            dir2: Index of second criterium: 1 by X, 2 by Y, 3 by Z

        Returns:
            True if renumbering has been applied, false otherwise
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/renumber/nodesbycoords/'+str(dir1)+'/'+str(dir2)+'', null, null));}
    async requestDesignerUndo(ustate=0) {
/*        ''' Request undo to remote connected instance of NextFEM Designer. Valid only after connect() command.
        
        Args:
            ustate (optional): Optional. Int value from UndoOps enumerator, default is Normal (0), NormalDontAsk (1), NoUndo (2).

        Returns:
            
        '''*/
        return await this.nfrest('GET', '/op/undo/'+str(ustate)+'', null, null);}
    async rotateNodes(nodes, axisX, axisY, axisZ, angle) {
/*        ''' Rotate nodes by moving them
        
        Args:
            nodes: Array of nodes ID to be rotated
            axisX: X component of rotation axis
            axisY: Y component of rotation axis
            axisZ: Z component of rotation axis
            angle: Angle of rotation, in degrees

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/rotatenodes/'+str(axisX)+'/'+str(axisY)+'/'+str(axisZ)+'/'+str(angle)+'', null, dict([("nodes",JSON.stringify(nodes))])));}
    async RunLoadCase(loadcase, outOfProc=false, noWindow=false) {
/*        ''' Run a single loadcase
        
        Args:
            loadcase: 
            outOfProc (optional): If true, run the loadcase out of process
            noWindow (optional): If true, hide the solver window or its output lines from console. Applicable only if out of process is active

        Returns:
            The first error encountered in analysis. If successful returns empty string.
        '''*/
        return await this.nfrest('GET', '/op/runlc/'+qt(loadcase)+'/'+str(outOfProc)+'/'+str(noWindow)+'', null, null);}
    async RunModel(outOfProc=false, noWindow=false) {
/*        ''' Run entire model
        
        Args:
            outOfProc (optional): If true, run the model out of process
            noWindow (optional): If true, hide the solver window or its output lines from console. Applicable only if out of process is active

        Returns:
            The first error encountered in analysis. If successful returns empty string.
        '''*/
        return await this.nfrest('GET', '/op/run/'+str(outOfProc)+'/'+str(noWindow)+'', null, null);}
    async saveDocX() {
/*        ''' Save the current DocX document to a file. After saving, the document cannot be modified, nor saved again.
        
        
        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/docx/save', null, null));}
    async saveDocXbytes(readOnlyPassword='') {
/*        ''' Save the current DocX document to an array of bytes. After saving, the document cannot be modified, nor saved again.
        
        Args:
            readOnlyPassword (optional): Set a read-only password for the document. If the password start with 'u_', unlocking is not possible

        Returns:
            Array of bytes
        '''*/
        return await this.nfrestB('POST', '/op/docx/bytes', readOnlyPassword, null)}
    async saveDocXtoHTML(pageTitle) {
/*        ''' Save the current DocX document to HTML format and return it as a string. After saving, the document cannot be modified, nor saved again.
        
        Args:
            pageTitle: Title of the resulting HTML page

        Returns:
            HTML code as string
        '''*/
        return await this.nfrest('POST', '/op/docx/html', pageTitle, null);}
    async saveForUndo(op) {
/*        ''' Request an undo before to continue
        
        Args:
            op: Description for the operation to be done

        Returns:
            True
        '''*/
        return sbool(await this.nfrest('POST', '/op/saveundo', op, null));}
    async saveModel(filename) {
/*        ''' Save the model and results with desired name
        
        Args:
            filename: 

        Returns:
            True if the model has been loaded correctly, False otherwise
        '''*/
        return sbool(await this.nfrest('GET', '/op/save', null, dict([("path",filename)])));}
    async saveOptions() {
/*        ''' Save program options, including solver preferences, tolerances, etc.
        
        
        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/opt/saveopts', null, null));}
    async saveSectionImage(sectionID, path) {
/*        ''' Save section plot into a Png image
        
        Args:
            sectionID: ID of the section
            path: Path for saving image, in PNG format. Only path and filename are required, no extension.

        Returns:
            True if successed
        '''*/
        return sbool(await this.nfrest('GET', '/op/sectioncalc/image/'+str(sectionID)+'', null, dict([("path",path)])));}
    async saveSectionImageWithBars(elemID, progr, path) {
/*        ''' Save a plot of an element section with rebar, if any, into a Png image
        
        Args:
            elemID: ID of the element
            progr: Progressive on element, from 0 to 100
            path: Path for saving image, in PNG format. Only path and filename are required, no extension.

        Returns:
            True if successed
        '''*/
        return sbool(await this.nfrest('GET', '/op/sectioncalc/imagewithbars/'+qt(elemID)+'/'+str(progr)+'', null, dict([("path",path)])));}
    async scaleNodes(nodes, scaleX, scaleY, scaleZ, scaleCenterX=0, scaleCenterY=0, scaleCenterZ=0) {
/*        ''' Scale nodes
        
        Args:
            nodes: Array of nodes ID to be scaled
            scaleX: Scale factor in X direction
            scaleY: Scale factor in Y direction
            scaleZ: Scale factor in Z direction
            scaleCenterX (optional): Scale center - X coordinate, optional, default 0
            scaleCenterY (optional): Scale center - Y coordinate, optional, default 0
            scaleCenterZ (optional): Scale center - Z coordinate, optional, default 0

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/scalenodes/'+str(scaleX)+'/'+str(scaleY)+'/'+str(scaleZ)+'/'+str(scaleCenterX)+'/'+str(scaleCenterY)+'/'+str(scaleCenterZ)+'', null, dict([("nodes",JSON.stringify(nodes))])));}
    async SectionToModel(sectionID, saveModelPath='') {
/*        ''' Write model of a section, meshed with Tria elements, typically for thermal analysis
        
        Args:
            sectionID: ID of the section
            saveModelPath (optional): Optional. Path to the model to write, otherwise current is used

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/model/section2model/'+qt(sectionID)+'', null, dict([("path",saveModelPath)])));}
    async seriesFromFunction(funcID) {
/*        ''' Get the series of the selected function
        
        Args:
            funcID: ID of the function

        Returns:
            An array of double (2 columns)
        '''*/
        return des(await this.nfrest('GET', '/function/series/'+str(funcID)+'', null, null));}
    async setAluSection(ID, SectionClass=3, Jw=0) {
/*        ''' Set aluminium checking parameters for section
        
        Args:
            ID: ID of the section
            SectionClass (optional): Steel class section
            Jw (optional): Warping constant

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/set/alu/'+str(ID)+'/'+str(SectionClass)+'/'+str(Jw)+'', null, null));}
    async setAnalysisSequence(name, previousCase) {
/*        ''' Set the loadcases calculation order by specifying the preceding case.
        
        Args:
            name: Name of the present loadcase to modify.
            previousCase: Name of the loadcase to be calculated before the present loadcase.

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/sequence/'+qt(name)+'/'+qt(previousCase)+'', null, null));}
    async setBC(node, x, y, z, rx, ry, rz) {
/*        ''' Set or change the boundary conditions (restraints) for a node
        
        Args:
            node: Node to be restrained
            x: True if restrained
            y: True if restrained
            z: True if restrained
            rx: True if restrained
            ry: True if restrained
            rz: True if restrained

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/bc/set/'+qt(node)+'/'+str(x)+'/'+str(y)+'/'+str(z)+'/'+str(rx)+'/'+str(ry)+'/'+str(rz)+'', null, null));}
    async setBeamAngle(num, angle) {
/*        ''' Set the rotation angle of the specified beam.
        
        Args:
            num: Number of the element
            angle: Angle in degrees

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/element/beamangle/'+qt(num)+'/'+str(angle)+'', null, null));}
    async setBucklingAnalysis(name, Nmodes, tol=0.0001) {
/*        ''' Set a buckling analysis from an existing loadcase, if it doesn't contain loads, use addLoadCaseToCombination to add the load contained in other loadcases.
        
        Args:
            name: Name of the loadcase
            Nmodes: Number of requested buckling modes
            tol (optional): Tolerance

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/setbuck/'+qt(name)+'/'+str(Nmodes)+'/'+str(tol)+'', null, null));}
    async setCombination(name, loadcase, factor, type_=0, servType=0) {
/*        ''' Set a linear add combination from an existing loadcase. It can be called multiple times. If the loadcase is already in combination, change its factor.
        
        Args:
            name: Name of the loadcase to transform into a combination, or target combination
            loadcase: Name of the loadcase to add to the combination
            factor: Factor for the loadcase to add to the combination
            type_ (optional): Set the combination type for checking: 0 (default) unknown, 1 ultimate, 2 serviceability, 3 seismic
            servType (optional): Set the combination type for checking: 0 (default) unknown, 1 characteristic, 2 frequent, 3 quasi-permanent

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/combo/set/'+qt(name)+'/'+qt(loadcase)+'/'+str(factor)+'/'+str(type_)+'/'+str(servType)+'', null, null));}
    async setCombinationCoeffPsi(subscript, type_, value) {
/*        ''' Set the psi combination coefficient to the desired value
        
        Args:
            subscript: 0 for psi0, 1 for psi1, 2 for psi2
            type_: 1 for variable loading, 2 for wind loads, 3 for snow loading
            value: Desired psi value

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/setpsi/'+str(subscript)+'/'+str(type_)+'/'+str(value)+'', null, null));}
    async setCombinationFactors(gG, gQ, psiVar=null, psiWind=null, psiSnow=null, gSW=0) {
/*        ''' Set or change combination factors
        
        Args:
            gG: Combination factor for permanent loading (default 1.4)
            gQ: Combination factor for variable loading (default 1.5)
            psiVar (optional): Optional array of size 3. Partial factors for variable loading (0.7,0.5,0.3)
            psiWind (optional): Optional array of size 3. Partial factors for wind loading (0.6,0.2,0.0)
            psiSnow (optional): Optional array of size 3. Partial factors for snow loading (0.5,0.2,0.0)
            gSW (optional): Optional override factor for self-weight (e.g. use 1.3 is as per NTC and set gG to 1.5)

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/setcfactors/'+str(gG)+'/'+str(gQ)+'/'+str(gSW)+'', null, dict([("psiVar",JSON.stringify(psiVar)),("psiWind",JSON.stringify(psiWind)),("psiSnow",JSON.stringify(psiSnow))])));}
    async setCompositeBeam(ID, MposFactor=-1, MnegFactor=-1) {
/*        ''' Set composite section beam properties
        
        Args:
            ID: ID of the section
            MposFactor (optional): Inertia weight factor for positive moment, default is 0.6
            MnegFactor (optional): Inertia weight factor for negative moment, default is 0.4

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/set/compositebeam/'+str(ID)+'/'+str(MposFactor)+'/'+str(MnegFactor)+'', null, null));}
    async setCompositeColumn(ID, EcFactor=-1, ReductionFactor=-1) {
/*        ''' Set composite section column properties
        
        Args:
            ID: ID of the section
            EcFactor (optional): Reduction factor for concrete modulus, default is 0.5
            ReductionFactor (optional): Reduction factor for column inertia, default is 0.9

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/set/compositecolumn/'+str(ID)+'/'+str(EcFactor)+'/'+str(ReductionFactor)+'', null, null));}
    async setConcretePropertiesNTC(matID, fc, isCharacteristic=true, unitsIn='MPa') {
/*        ''' Assign a custom compressive strength to a concrete material, recalculating E and ftk as per NTC code
        
        Args:
            matID: ID of the selected material
            fc: Compressive strength in MPa. If different units are used, specify them in unitsIn
            isCharacteristic (optional): Optional, default is true. fc is assumed to be a characteristic value. If set to false, it is assumed as an average value
            unitsIn (optional): Optional, default MPa. String specifying the units of fc

        Returns:
            The value of the calculated Young's modulus
        '''*/
        return parseFloat(await this.nfrest('GET', '/material/concretentc/'+str(matID)+'/'+str(fc)+'/'+str(isCharacteristic)+'', null, dict([("unitsIn",unitsIn)])));}
    async setConstraint(n, master, x, y, z, rx, ry, rz) {
/*        ''' Set a general constraint between 2 nodes
        
        Args:
            n: ID of slave node
            master: ID of master node
            x: True to apply constraint to this DoF
            y: True to apply constraint to this DoF
            z: True to apply constraint to this DoF
            rx: True to apply constraint to this DoF
            ry: True to apply constraint to this DoF
            rz: True to apply constraint to this DoF

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/mesh/constraint/'+qt(n)+'/'+qt(master)+'/'+str(x)+'/'+str(y)+'/'+str(z)+'/'+str(rx)+'/'+str(ry)+'/'+str(rz)+'', null, null));}
    async setElemAsJoint(num, status) {
/*        ''' Set the Joint property of the specified element.
        
        Args:
            num: Number of the element
            status: True or False to activate or deactivate the IsJoint flag

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/element/setjoint/'+qt(num)+'/'+str(status)+'', null, null));}
    async setElementChecks(ID, lc, time, data, setContour=false) {
/*        ''' Import a set of checks for the specified element. If already existing, the set is overwritten.
        
        Args:
            ID: ID of the element
            lc: Loadcase name
            time: Time
            data: A "API.check" instance containing check names and values
            setContour (optional): Optional. Activate contour in view instead of default capacity/demand ratios. Default is false

        Returns:
            True if imported successfully
        '''*/
        return sbool(await this.nfrest('GET', '/res/import/elementcheck/'+qt(ID)+'/'+qt(lc)+'/'+qt(time)+'/'+str(setContour)+'', null, dict([("data",data)])));}
    async setElementCustomProperty(elem, propName, propValue) {
/*        ''' Set or change an element custom property
        
        Args:
            elem: ID of the element
            propName: Property name
            propValue: Property value

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/element/customprop/'+qt(elem)+'/'+qt(propName)+'/'+qt(propValue)+'', null, null));}
    async setElementOffset(elem, offsetZ, offsetY) {
/*        ''' Set element line offset for the selected beam element
        
        Args:
            elem: ID of the beam element
            offsetZ: Offset in local z direction
            offsetY: Offset in local y direction

        Returns:
            True if successful, False otherwise
        '''*/
        return sbool(await this.nfrest('POST', '/element/beamoffset/'+qt(elem)+'/'+str(offsetZ)+'/'+str(offsetY)+'', null, null));}
    async setElementSection(elem, sectID) {
/*        ''' Assign a section to an element. An alternative to assignSectionToElement
        
        Args:
            elem: Beam or planar element ID
            sectID: ID of the section

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/section/'+qt(elem)+'/'+str(sectID)+'', null, null));}
    async setEndRelease(beamID, node, DOFmask, useStiffness=false) {
/*        ''' Assign an end release to a beam element by specifying its force percentage or joint stiffness.
        
        Args:
            beamID: ID of the beam element
            node: Node of the beam element to which assign release
            DOFmask: Array of 6 percentages (0=free, 1=fully connected) or stiffnesses if useStiffness is True
            useStiffness (optional): Set to true to specify stiffnesses into DOFmask

        Returns:
            True if successful, False if the cannot be assigned. End releases cannot be assigned to beams with flexural hinges.
        '''*/
        return sbool(await this.nfrest('POST', '/element/beamendrelease/'+qt(beamID)+'/'+qt(node)+'/'+str(useStiffness)+'', null, dict([("DOFmask",JSON.stringify(DOFmask))])));}
    async setEnvelope(name, loadcase, factor, type_=0, servType=0) {
/*        ''' Set an envelope combination from an existing loadcase. It can be called multiple times. If the loadcase is already in combination, change its factor.
        
        Args:
            name: Name of the loadcase to transform into a combination, or target combination
            loadcase: Name of the loadcase to add to the combination
            factor: Factor for the loadcase to add to the combination
            type_ (optional): Set the combination type for checking: 0 (default) unknown, 1 ultimate, 2 serviceability, 3 seismic
            servType (optional): Set the serviceability combination type for checking: 0 (default) unknown, 1 characteristic, 2 frequent, 3 quasi-permanent

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/combo/setenv/'+qt(name)+'/'+qt(loadcase)+'/'+str(factor)+'/'+str(type_)+'/'+str(servType)+'', null, null));}
    async setFiberSection(ID, divZ=0, divY=0) {
/*        ''' Make the selected section a fiber section. Suitable only for OpenSees solver.
        
        Args:
            ID: ID of the section
            divZ (optional): Division in Z direction
            divY (optional): Division in Y direction

        Returns:
            True if successful, False is section type is unknown (then use convertToMeshedSection)
        '''*/
        return sbool(await this.nfrest('GET', '/section/set/fibers/'+str(ID)+'/'+str(divZ)+'/'+str(divY)+'', null, null));}
    async setFirePoint(loadcase, fireNode, targetTemp, gradientY=0, gradientZ=0, tempAtten=20, dontLoadUnder=50, normalize=false) {
/*        ''' Set the point of fire used to set temperatures of all the elements in the model
        
        Args:
            loadcase: Loadcase
            fireNode: ID of the node setting the fire position
            targetTemp: Final target temperature, in °C
            gradientY (optional): Fixed gradient (local y) to be applied. Optional, default is 0
            gradientZ (optional): Fixed gradient (local z) to be applied. Optional, default is 0
            tempAtten (optional): Temperature attenuation. Optional, default is 20°C/m
            dontLoadUnder (optional): Don't apply load under this temperature. Optional, default is 50°C
            normalize (optional): Applied temperatures normalized with respect to target temp.

        Returns:
            A list of loaded elements
        '''*/
        return des(await this.nfrest('GET', '/load/firepoint/'+qt(loadcase)+'/'+qt(fireNode)+'/'+str(targetTemp)+'/'+str(gradientY)+'/'+str(gradientZ)+'/'+str(tempAtten)+'/'+str(dontLoadUnder)+'/'+str(normalize)+'', null, null));}
    async setFloorLoad(name, loadcase, loadvalue, dirX, dirY, dirZ) {
/*        ''' Add or modify floor load type
        
        Args:
            name: Name of the floor load type
            loadcase: Name of one of the loadcases composing the floor load
            loadvalue: Corresponding load value for the loadcase composing the floor load
            dirX: Vector for loading direction: x component
            dirY: Vector for loading direction: y component
            dirZ: Vector for loading direction: z component

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/floor/set/'+qt(name)+'/'+qt(loadcase)+'/'+str(loadvalue)+'/'+str(dirX)+'/'+str(dirY)+'/'+str(dirZ)+'', null, null));}
    async setFunctionGeneralData(funcID, data) {
/*        ''' Set custom data stored in the selected function
        
        Args:
            funcID: 
            data: 

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('POST', '/function/gendata/'+str(funcID)+'', null, dict([("data",JSON.stringify(data))])));}
    async setLanguage(code) {
/*        ''' Set language code
        
        Args:
            code: Supported codes: "en", "it", "es".

        Returns:
            
        '''*/
        return await this.nfrest('POST', '/op/opt/lang/'+qt(code)+'', null, null);}
    async setLoadA(load) {
/*        ''' Modify an existing load through an array, conforming to the one got via getLoadA
        
        Args:
            load: Array of strings with: ID,Node,Element,Direction,Load value,Load case

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/load/setA', load, null));}
    async setLoadcaseFactor(loadcase, factor) {
/*        ''' Change load factor for the function associated to the selected loadcase
        
        Args:
            loadcase: Name of the loadcase
            factor: Factor, cannot be 0

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/setfactor/'+qt(loadcase)+'/'+str(factor)+'', null, null));}
    async setLoadCasePhaseInCombination(name, loadcase, phase) {
/*        ''' Set the phase to a loadcase in an already existing combination, for analysis. Useful in buckling analysis to distinguish constant from variable loading cases
        
        Args:
            name: Name of the combination or buckling analysis
            loadcase: Name of the loadcase to add to the combination
            phase: Set phase as integer for the selected loadcase in the combination. 0 for variable load, 1 for constant load

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/combo/setphase/'+qt(name)+'/'+qt(loadcase)+'/'+str(phase)+'', null, null));}
    async setLoadCaseType(name, type_) {
/*        ''' Set loadcase type
        
        Args:
            name: Name of the loadcase
            type_: Integer type: 0 Dead, 1 Live, 2 Wind, 3 Snow, 4 User, 5 Quake, 6 unknown, 7 Thermal, 8 Prestress

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/settype/'+qt(name)+'/'+str(type_)+'', null, null));}
    async setLoadDurationClass(loadcase, durationClass) {
/*        ''' Set the load duration class for the selected loadcase
        
        Args:
            loadcase: Name of the loadcase
            durationClass: 0 Permanent, 1 Long term, 2 Medium term, 3 Short term, 4 Istantaneous

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/setduration/'+qt(loadcase)+'/'+str(durationClass)+'', null, null));}
    async setLoadsToMass(loadcase, factor=1, remove=false) {
/*        ''' Add, modify or remove a load-to-mass setting.
        
        Args:
            loadcase: Name of the loadcase containing loads
            factor (optional): Factor for conversion in mass
            remove (optional): Flag for removing the selected loadcase from setting

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/mass/load2mass/'+qt(loadcase)+'/'+str(factor)+'/'+str(remove)+'', null, null));}
    async setMacroelement(elemID, macroType) {
/*        ''' Assign macroelement type to the selected element
        
        Args:
            elemID: Selected element ID
            macroType: Line=0, Line3=1, Quad1=2, Quad2=3, Quad3=4, masonryWall=5, rigidWall=6. Use -1 to remove assignation

        Returns:
            Boolean
        '''*/
        return sbool(await this.nfrest('POST', '/element/macro/'+qt(elemID)+'/'+str(macroType)+'', null, null));}
    async setModalAnalysis(name, Nmodes, tol=0.0001) {
/*        ''' Set a modal analysis upon an existing load case
        
        Args:
            name: Name of the loadcase
            Nmodes: Number of requested modes
            tol (optional): Tolerance

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/setmodal/'+qt(name)+'/'+str(Nmodes)+'/'+str(tol)+'', null, null));}
    async setNLDanalysis(name, tStep, nSteps, tol, iters, seriesID, Xfactor, Yfactor, Zfactor, RXfactor, RYfactor, RZfactor, seriesFactor=1, Mdamp=0, NlGeo=false) {
/*        ''' Set a non linear dynamic analysis upon an existing load case
        
        Args:
            name: Name of the loadcase
            tStep: Time step
            nSteps: Number of steps
            tol: Tolerance
            iters: Maximum iterations for each increment
            seriesID: ID of the series
            Xfactor: Factor for time series in X direction
            Yfactor: Factor for time series in Y direction
            Zfactor: Factor for time series in Z direction
            RXfactor: Factor for time series in RX direction
            RYfactor: Factor for time series in RY direction
            RZfactor: Factor for time series in RZ direction
            seriesFactor (optional): Factor for the series
            Mdamp (optional): Mass damping factor
            NlGeo (optional): Flag for accounting second-order effects

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/setnldyn/'+qt(name)+'/'+str(tStep)+'/'+str(nSteps)+'/'+str(tol)+'/'+str(iters)+'/'+str(seriesID)+'/'+str(Xfactor)+'/'+str(Yfactor)+'/'+str(Zfactor)+'/'+str(RXfactor)+'/'+str(RYfactor)+'/'+str(RZfactor)+'/'+str(seriesFactor)+'/'+str(Mdamp)+'/'+str(NlGeo)+'', null, null));}
    async setNLSanalysis(name, tStep, nSteps, tol, iters=10, seriesID=-1, dispControlNode='', dispControlDOF=0, NlGeo=false) {
/*        ''' Set a non linear static analysis upon an existing load case
        
        Args:
            name: Name of the loadcase
            tStep: Time step
            nSteps: Number of steps
            tol: Tolerance
            iters (optional): Maximum iterations for each increment
            seriesID (optional): ID of the series
            dispControlNode (optional): ID of the node for displacement control
            dispControlDOF (optional): DOF of the control node for displ. control
            NlGeo (optional): Flag for accounting second-order effects

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/setnlstatic/'+qt(name)+'/'+str(tStep)+'/'+str(nSteps)+'/'+str(tol)+'/'+str(iters)+'/'+str(seriesID)+'/'+qt(dispControlNode)+'/'+str(dispControlDOF)+'/'+str(NlGeo)+'', null, null));}
    async setNodeAsJoint(num, status) {
/*        ''' Set the Joint property of the specified node.
        
        Args:
            num: Number of the node
            status: True or False to activate or deactivate the IsJoint flag

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/node/setjoint/'+qt(num)+'/'+str(status)+'', null, null));}
    async setNodeChecks(ID, lc, time, data, setContour=false) {
/*        ''' Import a set of checks for the specified node. If already existing, the set is overwritten.
        
        Args:
            ID: ID of the node
            lc: Loadcase name
            time: Time
            data: A "API.check" instance containing check names and values
            setContour (optional): Optional. Activate contour in view instead of default capacity/demand ratios. Default is false

        Returns:
            True if imported successfully
        '''*/
        return sbool(await this.nfrest('GET', '/res/import/nodecheck/'+qt(ID)+'/'+qt(lc)+'/'+qt(time)+'/'+str(setContour)+'', null, dict([("data",data)])));}
    async setNodeCoordinates(ID, coords) {
/*        ''' Set or change node coordinates as double array
        
        Args:
            ID: ID of the node
            coords: Array of size 3 containing nodal coordinates

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('POST', '/node/'+qt(ID)+'', coords, null));}
    async setNodeCS(num, x1, y1, z1, x2, y2, z2) {
/*        ''' Set the Local Coordinate System of a node by specifying the first 2 vectors.
        
        Args:
            num: Number of the node
            x1: x coord. of 1st vector
            y1: y coord. of 1st vector
            z1: z coord. of 1st vector
            x2: x coord. of 2st vector
            y2: y coord. of 2st vector
            z2: z coord. of 2st vector

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/node/cs/'+qt(num)+'/'+str(x1)+'/'+str(y1)+'/'+str(z1)+'/'+str(x2)+'/'+str(y2)+'/'+str(z2)+'', null, null));}
    async setNodePosition(node) {
/*        ''' Set or change node position as vert3 object
        
        Args:
            node: vert3 structure of the node

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('POST', '/nodev', node, null));}
    async setPDeltaAnalysis(name, tol=0.0001) {
/*        ''' Set a PDelta analysis from an existing loadcase, if it doesn't contain loads, use addLoadCaseToCombination to add the load contained in other loadcases.
        
        Args:
            name: Name of the loadcase
            tol (optional): Tolerance

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/setpdelta/'+qt(name)+'/'+str(tol)+'', null, null));}
    async setPlaneStrainElement(id_, isPlaneStrain) {
/*        ''' Set plane strain condition to a planar element. This method has effect only on planar elements and it is ignored for other types of elements.
        
        Args:
            id_: 
            isPlaneStrain: 

        Returns:
            
        '''*/
        return sbool(await this.nfrest('GET', '/element/planestrain/'+qt(id_)+'/'+str(isPlaneStrain)+'', null, null));}
    async setPlaneStressElement(id_, isPlaneStress) {
/*        ''' Set plane stress condition to a planar element. This method has effect only on planar elements and it is ignored for other types of elements.
        
        Args:
            id_: 
            isPlaneStress: 

        Returns:
            
        '''*/
        return sbool(await this.nfrest('GET', '/element/planestress/'+qt(id_)+'/'+str(isPlaneStress)+'', null, null));}
    async setResponseSpectrumAnalysis(direction, loadcase, modesNumber, spectrumFuncID, modalDamping=0.05, factor=1) {
/*        ''' Set a Response Spectrum analysis on an existing loadcase
        
        Args:
            direction: 1 X, 2 Y, 3 Z
            loadcase: Name of the seismic loadcase
            modesNumber: NUmber of modes to be considered
            spectrumFuncID: ID of the spectral acceleration or displacement function
            modalDamping (optional): Optional. Modal damping to be assumed. Default is 0.05
            factor (optional): Optional. Amplification factor. Default is 1

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/setrs/'+str(direction)+'/'+qt(loadcase)+'/'+str(modesNumber)+'/'+str(spectrumFuncID)+'/'+str(modalDamping)+'/'+str(factor)+'', null, null));}
    async setRigidDiaphragms(constraintType=0, nodesList=null, masterNode='', restrainZMaster=false) {
/*        ''' Set rigid diaphragms for all model. Floors heigths are taken automatically, restrained floors are skipped.
        
        Args:
            constraintType (optional): 0 for automatic master node, 1 to add a master node, 2 to manually specify master node for a selected group of nodes
            nodesList (optional): Optional list containing nodes ID for the rigid floor. If not specified, all nodes are taken
            masterNode (optional): ID of master node, only if constraintType = 2
            restrainZMaster (optional): Restrain the master node in Z direction, only if constraintType is 1 or 2

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('PUT', '/op/mesh/rigiddiaph/'+str(constraintType)+'/'+qt(masterNode)+'/'+str(restrainZMaster)+'', null, dict([("nodesList",JSON.stringify(nodesList))])));}
    async setRigidLink(n1, n2) {
/*        ''' Set a rigid link between two nodes.
        
        Args:
            n1: ID of first node (master)
            n2: ID of second node (slave)

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('PUT', '/op/mesh/rigidlink/'+qt(n1)+'/'+qt(n2)+'', null, null));}
    async setRigidOffsets(beamID, values, isAbsLength=false) {
/*        ''' Assign rigid offsets to beam.
        
        Args:
            beamID: ID of the beam element
            values: Array of size 2 containing length ratio for each end (I, J)
            isAbsLength (optional): True to use absolute length instead of ratio

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/element/beamendoffset/'+qt(beamID)+'/'+str(isAbsLength)+'', null, dict([("values",JSON.stringify(values))])));}
    async setSectionAngle(ID, a) {
/*        ''' Set the rotation angle for a beam section.
        
        Args:
            ID: ID of the section
            a: Angle in degrees

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/set/angle/'+str(ID)+'/'+str(a)+'', null, null));}
    async setSectionColor(ID, Red, Green, Blue) {
/*        ''' Set the color of the selected section in RGB format
        
        Args:
            ID: ID of the section
            Red: Red [0,255]
            Green: Green [0,255]
            Blue: Blue [0,255]

        Returns:
            True if successful, False otherwise
        '''*/
        return sbool(await this.nfrest('POST', '/section/set/color/'+qt(ID)+'/'+str(Red)+'/'+str(Green)+'/'+str(Blue)+'', null, null));}
    async setSectionMaterial(ID, materialID) {
/*        ''' Set the material as section property
        
        Args:
            ID: ID of the section
            materialID: ID of the material to associate

        Returns:
            True
        '''*/
        return sbool(await this.nfrest('GET', '/section/set/material/'+str(ID)+'/'+str(materialID)+'', null, null));}
    async setSectionOffset(ID, offsetZ, offsetY) {
/*        ''' Set a section offset for the selected beam section
        
        Args:
            ID: ID of the beam section
            offsetZ: Offset in local z direction
            offsetY: Offset in local y direction

        Returns:
            True if successful, False otherwise
        '''*/
        return sbool(await this.nfrest('POST', '/section/set/offset/'+qt(ID)+'/'+str(offsetZ)+'/'+str(offsetY)+'', null, null));}
    async setSectionProperty(ID, name, value) {
/*        ''' Set selected property of a section. To change name or code properties, use renameSection method.
        
        Args:
            ID: ID of the section
            name: Name of the property: Area, Jxc, Jyc, Jxyc, Jt, Iw, shAreaX, shAreaY, or custom value to be added
            value: Value to be stored

        Returns:
            1 if native propery has changes, 2 if custom property is added, 0 in case of error
        '''*/
        return parseInt(await this.nfrest('POST', '/section/prop/'+qt(ID)+'/'+qt(name)+'/'+str(value)+'', null, null));}
    async setSectionRebarsToElements(ID) {
/*        ''' Assign section rebars and stirrups in elements having the same section
        
        Args:
            ID: ID of the section

        Returns:
            True is successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/rebar/toelems/'+qt(ID)+'', null, null));}
    async setSectionRebarsToElements(ID) {
/*        ''' Assign section rebars and stirrups in elements having the same section
        
        Args:
            ID: ID of the section

        Returns:
            True is successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/rebar/toelems/'+str(ID)+'', null, null));}
    async setSeismicFloorEccentricity(thID, ct=0.05, lam=1) {
/*        ''' Compute floor torque moments for accounting 5% eccentricity for center of mass of each rigid floor. Rigid diaphragms and masses are required.
        
        Args:
            thID: ID of the spectrum function to be used as reference for total base shear
            ct (optional): Optional, default 0.05. Coefficient for estimation of fundamental period from EC8 4.6: T1=ct*H^(3/4)
            lam (optional): Optional, default 1. Coefficient for estimation of base shear as per EC8 4.5: Fb=Sd(T1)*m*lam

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/combo/setseismicecc/'+str(thID)+'/'+str(ct)+'/'+str(lam)+'', null, null));}
    async setSeismicLoadcaseForCombos(direction, loadcase, enableFloorEccentricity5=false, seismicCombinationType=0) {
/*        ''' Set the seismic loadcase for directional combinations (e.g. response spectrum). Repeat the command for other directions.
        
        Args:
            direction: 1 X, 2 Y, 3 Z
            loadcase: Name of the seismic loadcase
            enableFloorEccentricity5 (optional): Optional. False as default
            seismicCombinationType (optional): Optional. 100,30 rule is default (0), use (1) for SRSS rule

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/combo/setseismiclc/'+str(direction)+'/'+qt(loadcase)+'/'+str(enableFloorEccentricity5)+'/'+str(seismicCombinationType)+'', null, null));}
    async setSelfWeight(loadcase) {
/*        ''' Set the loadcase hosting the automatic self-weight
        
        Args:
            loadcase: Name of the loadcase hosting the automatic self-weight

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/setsw/'+qt(loadcase)+'', null, null));}
    async setSelfWeightDirection(direction) {
/*        ''' Set the self-weight direction in space
        
        Args:
            direction: Default is -Z=-3. X=1, Y=2, Z=3, -X=-1, -Y=-2, -Z=-3

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/load/setswdir/'+str(direction)+'', null, null));}
    async setShearReinfRCdata(ID, data) {
/*        ''' Set or overwrite material data for shear reinforcement with tension-fragile design material in RC section. Set Shear strip width less than or equal to 0 to remove data
        
        Args:
            ID: ID of the section
            data: Array containing: Shear strip width, Shear strip spacing, Shear strip angle [°], Shear strip material ID, Shear strip thickness [mm], Shear strip height, Confinement strip spacing (-1 for continuous), Shear strip height along base

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/set/shearreinfrc/'+str(ID)+'', null, dict([("data",JSON.stringify(data))])));}
    async setShellEndRelease(ID, node, DOFmask) {
/*        ''' Set end release for shell element
        
        Args:
            ID: ID of the shell element. Must be Tria or Quad
            node: ID of the shell node to release
            DOFmask: Array of 6 boolean values (fx, fy, fz, mx, my, drilling)

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/element/shellendrelease/'+qt(ID)+'/'+qt(node)+'', null, dict([("DOFmask",JSON.stringify(DOFmask))])));}
    async setSpringLocalAxes(name, x1, y1, z1, x2, y2, z2) {
/*        ''' Set local axes in the selected spring property
        
        Args:
            name: Name of the spring property
            x1: Local axis 1 - x
            y1: Local axis 1 - y
            z1: Local axis 1 - z
            x2: Local axis 2 - x
            y2: Local axis 2 - y
            z2: Local axis 2 - z

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('POST', '/springproperty/axes/'+qt(name)+'/'+str(x1)+'/'+str(y1)+'/'+str(z1)+'/'+str(x2)+'/'+str(y2)+'/'+str(z2)+'', null, null));}
    async setSRSScombination(name, loadcase, factor, type_=0, servType=0) {
/*        ''' Set a linear add combination from an existing loadcase. It can be called multiple times.
        
        Args:
            name: Name of the loadcase to transform into a combination, or target combination
            loadcase: Name of the loadcase to add to the combination
            factor: Factor for the loadcase to add to the combination
            type_ (optional): Set the combination type for checking: 0 (default) unknown, 1 ultimate, 2 serviceability, 3 seismic
            servType (optional): Set the combination type for checking: 0 (default) unknown, 1 characteristic, 2 frequent, 3 quasi-permanent

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/loadcase/combo/setsrss/'+qt(name)+'/'+qt(loadcase)+'/'+str(factor)+'/'+str(type_)+'/'+str(servType)+'', null, null));}
    async setSteelSection(ID, SectionClass=3, alphaLT=0.76, alphay=0.76, alphaz=0.76, Jw=0) {
/*        ''' Set steel checking parameters for section
        
        Args:
            ID: ID of the section
            SectionClass (optional): Steel class section
            alphaLT (optional): Stability curve factor for lateral-torsional buckling
            alphay (optional): Stability factor for flexural buckling around y axis
            alphaz (optional): Stability factor for flexural buckling around z axis
            Jw (optional): Warping constant

        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/set/steel/'+str(ID)+'/'+str(SectionClass)+'/'+str(alphaLT)+'/'+str(alphay)+'/'+str(alphaz)+'/'+str(Jw)+'', null, null));}
    async setUnits(length, force) {
/*        ''' Set units in the model
        
        Args:
            length: String with desider unit, eg. "m"
            force: String with desider unit, eg. "kN"

        Returns:
            Boolean value
        '''*/
        return sbool(await this.nfrest('GET', '/units/set/'+qt(length)+'/'+qt(force)+'', null, null));}
    async setWall(elems, rotate90=false, isSlab=false) {
/*        ''' Create a wall for design, including 3 section cuts, from the selected planar elements
        
        Args:
            elems: Array of elements forming the wall
            rotate90 (optional): Optional. To create vertical section cuts, set to true
            isSlab (optional): Optional. If set to true, no section cuts are created

        Returns:
            Name of the newly created wall group
        '''*/
        return await this.nfrest('GET', '/element/walls/set/'+str(rotate90)+'/'+str(isSlab)+'', null, dict([("elems",JSON.stringify(elems))]));}
    async showViewport(path, width=600, height=400) {
/*        ''' Open the viewport showing the model in path. REST version only against local instance of NextFEM Designer
        
        Args:
            path: 
            width (optional): 
            height (optional): 

        Returns:
            
        '''*/
        return sbool(await this.nfrest('GET', '/op/showvieport/'+qt(path)+'/'+str(width)+'/'+str(height)+'', null, null));}
    async splitElementsByRebarSegments() {
/*        ''' Split element in segments according to rebar distribution. It is necessary to include all rebar segments in fiber analysis.  Effective only on Line elements.
        
        
        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/section/rebar/splitsegments', null, null));}
    async unDo() {
/*        ''' Undo the last operation.
        
        
        Returns:
            True if successful
        '''*/
        return sbool(await this.nfrest('GET', '/op/undo', null, null));}
    async userCheck(verName, overrideValues=null) {
/*        ''' Run checking on user script. No node or element quantities are given. See also getItemDataResults method.
        
        Args:
            verName: Name of the checking to be used
            overrideValues (optional): Optional dictionary of {string, double} containing overrides for checking

        Returns:
            
        '''*/
        return des(await this.nfrest('POST', '/res/check/user'+qt(verName)+'', overrideValues, null));}
    async valueFromFunction(Xval, funcID) {
/*        ''' Get the value of the selected function corresponding to the desired abscissa
        
        Args:
            Xval: Abscissa
            funcID: ID of the function

        Returns:
            The ordinate for the desired abscissa and function.
        '''*/
        return parseFloat(await this.nfrest('GET', '/function/value/'+str(Xval)+'/'+str(funcID)+'', null, null));}
    async valueFromString(text, valueName) {
/*        ''' Get value from a string containing key=value
        
        Args:
            text: String to be processed
            valueName: Key name

        Returns:
            
        '''*/
        return await this.nfrest('POST', '/op/import/valfromstring/'+qt(valueName)+'', text, null);}
    async vertexFromNode(node) {
/*        ''' Get vertex from node for calculation with vert3 class.
        
        Args:
            node: ID of the node

        Returns:
            A vert3 object
        '''*/
        return await this.nfrest('GET', '/node/vertex/'+qt(node)+'', null, null);}
    get areaColor() { return this.nfrest('GET', '/model/colors/area')};
    set areaColor(value) { return this.nfrest('POST', '/model/colors/area', {heads: {val: String(value)}}) };
    get autoMassInX() { return this.nfrest('GET', '/mass/autoX')};
    set autoMassInX(value) { return this.nfrest('POST', '/mass/autoX', {heads: {val: String(value)}}) };
    get autoMassInY() { return this.nfrest('GET', '/mass/autoY')};
    set autoMassInY(value) { return this.nfrest('POST', '/mass/autoY', {heads: {val: String(value)}}) };
    get autoMassInZ() { return this.nfrest('GET', '/mass/autoZ')};
    set autoMassInZ(value) { return this.nfrest('POST', '/mass/autoZ', {heads: {val: String(value)}}) };
    get backgroundColor() { return this.nfrest('GET', '/model/colors/back')};
    set backgroundColor(value) { return this.nfrest('POST', '/model/colors/back', {heads: {val: String(value)}}) };
    get baselineGrade() { return this.nfrest('GET', '/op/opt/baseline')};
    set baselineGrade(value) { return this.nfrest('POST', '/op/opt/baseline', {heads: {val: String(value)}}) };
    get binFolder() { return this.nfrest('GET', '/op/opt/binfolder')};
    set binFolder(value) { return this.nfrest('POST', '/op/opt/binfolder', {heads: {val: String(value)}}) };
    get bordersColor() { return this.nfrest('GET', '/model/colors/border')};
    set bordersColor(value) { return this.nfrest('POST', '/model/colors/border', {heads: {val: String(value)}}) };
    get colorRule() { return this.nfrest('GET', '/model/colors/rule')};
    get constraintsColor() { return this.nfrest('GET', '/model/colors/constraint')};
    set constraintsColor(value) { return this.nfrest('POST', '/model/colors/constraint', {heads: {val: String(value)}}) };
    get defSolverType() { return this.nfrest('GET', '/op/opt/defsolvertype')};
    get designMaterialsID() { return this.nfrest('GET', '/designmaterials')};
    get DocXfontSize() { return this.nfrest('GET', '/op/docx/fontsize')};
    set DocXfontSize(value) { return this.nfrest('POST', '/op/docx/fontsize', {heads: {val: String(value)}}) };
    get DocXtableAlignment() { return this.nfrest('GET', '/op/docx/tablealign')};
    set DocXtableAlignment(value) { return this.nfrest('POST', '/op/docx/tablealign', {heads: {val: String(value)}}) };
    get DocXtableBorders() { return this.nfrest('GET', '/op/docx/tableborders')};
    set DocXtableBorders(value) { return this.nfrest('POST', '/op/docx/tableborders', {heads: {val: String(value)}}) };
    get DocXtableFitting() { return this.nfrest('GET', '/op/docx/tablefit')};
    set DocXtableFitting(value) { return this.nfrest('POST', '/op/docx/tablefit', {heads: {val: String(value)}}) };
    get DocXtableFontSize() { return this.nfrest('GET', '/op/docx/tablefontsize')};
    set DocXtableFontSize(value) { return this.nfrest('POST', '/op/docx/tablefontsize', {heads: {val: String(value)}}) };
    get dontDeleteChecks() { return this.nfrest('GET', '/res/donotdeletechecks')};
    set dontDeleteChecks(value) { return this.nfrest('POST', '/res/donotdeletechecks', {heads: {val: String(value)}}) };
    get dontDeleteResults() { return this.nfrest('GET', '/res/donotdelete')};
    set dontDeleteResults(value) { return this.nfrest('POST', '/res/donotdelete', {heads: {val: String(value)}}) };
    get DXFoptions() { return this.nfrest('GET', '/op/opt/dxfoptions')};
    set DXFoptions(value) { return this.nfrest('POST', '/op/opt/dxfoptions', {heads: {val: String(value)}}) };
    get elemsList() { return this.nfrest('GET', '/elements')};
    get elemsNumber() { return this.nfrest('GET', '/elements/number')};
    get elemTextColor() { return this.nfrest('GET', '/model/colors/elemtext')};
    set elemTextColor(value) { return this.nfrest('POST', '/model/colors/elemtext', {heads: {val: String(value)}}) };
    get envName() { return this.nfrest('GET', '/model/env')};
    get hingesColor() { return this.nfrest('GET', '/model/colors/hinge')};
    set hingesColor(value) { return this.nfrest('POST', '/model/colors/hinge', {heads: {val: String(value)}}) };
    get IFC_format() { return this.nfrest('GET', '/op/opt/ifcformat')};
    set IFC_format(value) { return this.nfrest('POST', '/op/opt/ifcformat', {heads: {val: String(value)}}) };
    get IFC_includeAnalyticalModel() { return this.nfrest('GET', '/op/opt/ifcanalytical')};
    set IFC_includeAnalyticalModel(value) { return this.nfrest('POST', '/op/opt/ifcanalytical', {heads: {val: String(value)}}) };
    get IFC_WallMeshSize() { return this.nfrest('GET', '/op/opt/ifcwallmeshsize')};
    set IFC_WallMeshSize(value) { return this.nfrest('POST', '/op/opt/ifcwallmeshsize', {heads: {val: String(value)}}) };
    get isRemote() { return this.nfrest('GET', 'na')};
    get lineColor() { return this.nfrest('GET', '/model/colors/line')};
    set lineColor(value) { return this.nfrest('POST', '/model/colors/line', {heads: {val: String(value)}}) };
    get loading() { return this.nfrest('GET', '')};
    get massColor() { return this.nfrest('GET', '/model/colors/mass')};
    set massColor(value) { return this.nfrest('POST', '/model/colors/mass', {heads: {val: String(value)}}) };
    get materialsID() { return this.nfrest('GET', '/materials')};
    get modeldata() { return this.nfrest('GET', '/model/data')};
    set modeldata(value) { return this.nfrest('POST', '/model/data', value)};
    get modelName() { return this.nfrest('GET', '/model')};
    set modelName(value) { return this.nfrest('POST', '/model', {heads: {val: String(value)}}) };
    get modelPath() { return this.nfrest('GET', '/model/path')};
    get modelresults() { return this.nfrest('GET', '/model/results')};
    set modelresults(value) { return this.nfrest('POST', '/model/results', value)};
    get nodeColor() { return this.nfrest('GET', '/model/colors/node')};
    set nodeColor(value) { return this.nfrest('POST', '/model/colors/node', {heads: {val: String(value)}}) };
    get nodesList() { return this.nfrest('GET', '/nodes')};
    get nodesNumber() { return this.nfrest('GET', '/nodes/number')};
    get nodeTextColor() { return this.nfrest('GET', '/model/colors/nodetext')};
    set nodeTextColor(value) { return this.nfrest('POST', '/model/colors/nodetext', {heads: {val: String(value)}}) };
    get numberFormat() { return this.nfrest('GET', '/op/opt/numberformat')};
    set numberFormat(value) { return this.nfrest('POST', '/op/opt/numberformat', {heads: {val: String(value)}}) };
    get OS_beamWithHingesOption() { return this.nfrest('GET', '/op/opt/os/beamwithhinges')};
    set OS_beamWithHingesOption(value) { return this.nfrest('POST', '/op/opt/os/beamwithhinges', {heads: {val: String(value)}}) };
    get OS_concreteTensileStrength() { return this.nfrest('GET', '/op/opt/os/tensilesrc')};
    set OS_concreteTensileStrength(value) { return this.nfrest('POST', '/op/opt/os/tensilesrc', {heads: {val: String(value)}}) };
    get OS_IntegrationPointsOption() { return this.nfrest('GET', '/op/opt/os/intpoints')};
    set OS_IntegrationPointsOption(value) { return this.nfrest('POST', '/op/opt/os/intpoints', {heads: {val: String(value)}}) };
    get OS_NDfiberSectionsOption() { return this.nfrest('GET', '/op/opt/os/ndfibersects')};
    set OS_NDfiberSectionsOption(value) { return this.nfrest('POST', '/op/opt/os/ndfibersects', {heads: {val: String(value)}}) };
    get OS_saveStateVariables() { return this.nfrest('GET', '/op/opt/os/statevars')};
    set OS_saveStateVariables(value) { return this.nfrest('POST', '/op/opt/os/statevars', {heads: {val: String(value)}}) };
    get releasesColor() { return this.nfrest('GET', '/model/colors/release')};
    set releasesColor(value) { return this.nfrest('POST', '/model/colors/release', {heads: {val: String(value)}}) };
    get resCalc_accuracy() { return this.nfrest('GET', '/op/opt/calcaccuracy')};
    set resCalc_accuracy(value) { return this.nfrest('POST', '/op/opt/calcaccuracy', {heads: {val: String(value)}}) };
    get resCalc_cacheEnabled() { return this.nfrest('GET', '/op/opt/rescalc/cacheenabled')};
    set resCalc_cacheEnabled(value) { return this.nfrest('POST', '/op/opt/rescalc/cacheenabled', {heads: {val: String(value)}}) };
    get resCalc_cacheSize() { return this.nfrest('GET', '/op/opt/calcusefibers')};
    set resCalc_cacheSize(value) { return this.nfrest('POST', '/op/opt/calcusefibers', {heads: {val: String(value)}}) };
    get resCalc_concreteBehaviour() { return this.nfrest('GET', '/op/opt/rescalc/concbeh')};
    set resCalc_concreteBehaviour(value) { return this.nfrest('POST', '/op/opt/rescalc/concbeh', {heads: {val: String(value)}}) };
    get resCalc_domainCorrectionType() { return this.nfrest('GET', '/op/opt/rescalc/domcorr')};
    set resCalc_domainCorrectionType(value) { return this.nfrest('POST', '/op/opt/rescalc/domcorr', {heads: {val: String(value)}}) };
    get resCalc_elasticTolerance() { return this.nfrest('GET', '/op/opt/rescalc/eltoll')};
    set resCalc_elasticTolerance(value) { return this.nfrest('POST', '/op/opt/rescalc/eltoll', {heads: {val: String(value)}}) };
    get resCalc_getAllJSONresults() { return this.nfrest('GET', '/op/opt/rescalc/allresjson')};
    set resCalc_getAllJSONresults(value) { return this.nfrest('POST', '/op/opt/rescalc/allresjson', {heads: {val: String(value)}}) };
    get resCalc_homogBarsFactor() { return this.nfrest('GET', '/op/opt/rescalc/homog')};
    set resCalc_homogBarsFactor(value) { return this.nfrest('POST', '/op/opt/rescalc/homog', {heads: {val: String(value)}}) };
    get resCalc_kMod() { return this.nfrest('GET', '/op/opt/rescalc/kmod')};
    set resCalc_kMod(value) { return this.nfrest('POST', '/op/opt/rescalc/kmod', {heads: {val: String(value)}}) };
    get resCalc_rebarHardeningRatio() { return this.nfrest('GET', '/op/opt/rescalc/rebhard')};
    set resCalc_rebarHardeningRatio(value) { return this.nfrest('POST', '/op/opt/rescalc/rebhard', {heads: {val: String(value)}}) };
    get resCalc_refinement() { return this.nfrest('GET', '/op/opt/calcrefinement')};
    set resCalc_refinement(value) { return this.nfrest('POST', '/op/opt/calcrefinement', {heads: {val: String(value)}}) };
    get resCalc_resDomainSlices() { return this.nfrest('GET', '/op/opt/rescalc/domainslices')};
    set resCalc_resDomainSlices(value) { return this.nfrest('POST', '/op/opt/rescalc/domainslices', {heads: {val: String(value)}}) };
    get resCalc_responseInTension() { return this.nfrest('GET', '/op/opt/rescalc/tensresp')};
    set resCalc_responseInTension(value) { return this.nfrest('POST', '/op/opt/rescalc/tensresp', {heads: {val: String(value)}}) };
    get resCalc_steelClass() { return this.nfrest('GET', '/op/opt/rescalc/steelclass')};
    set resCalc_steelClass(value) { return this.nfrest('POST', '/op/opt/rescalc/steelclass', {heads: {val: String(value)}}) };
    get resCalc_strandHardeningRatio() { return this.nfrest('GET', '/op/opt/rescalc/strhard')};
    set resCalc_strandHardeningRatio(value) { return this.nfrest('POST', '/op/opt/rescalc/strhard', {heads: {val: String(value)}}) };
    get resCalc_useFibers() { return this.nfrest('GET', '/op/opt/calcusefibers')};
    set resCalc_useFibers(value) { return this.nfrest('POST', '/op/opt/calcusefibers', {heads: {val: String(value)}}) };
    get restraintsColor() { return this.nfrest('GET', '/model/colors/restraint')};
    set restraintsColor(value) { return this.nfrest('POST', '/model/colors/restraint', {heads: {val: String(value)}}) };
    get saveStateVariables() { return this.nfrest('GET', '/op/opt/os/statevars')};
    set saveStateVariables(value) { return this.nfrest('POST', '/op/opt/os/statevars', {heads: {val: String(value)}}) };
    get sectionsID() { return this.nfrest('GET', '/sections')};
    get selAreaColor() { return this.nfrest('GET', '/model/colors/selarea')};
    set selAreaColor(value) { return this.nfrest('POST', '/model/colors/selarea', {heads: {val: String(value)}}) };
    get selectedElements() { return this.nfrest('GET', '/op/selectedelements')};
    set selectedElements(value) { return this.nfrest('POST', '/op/selectedelements', {heads: {val: String(value)}}) };
    get selectedNodes() { return this.nfrest('GET', '/op/selectednodes')};
    set selectedNodes(value) { return this.nfrest('POST', '/op/selectednodes', {heads: {val: String(value)}}) };
    get selLineColor() { return this.nfrest('GET', '/model/colors/selline')};
    set selLineColor(value) { return this.nfrest('POST', '/model/colors/selline', {heads: {val: String(value)}}) };
    get selNodeColor() { return this.nfrest('GET', '/model/colors/selnode')};
    set selNodeColor(value) { return this.nfrest('POST', '/model/colors/selnode', {heads: {val: String(value)}}) };
    get selSolidColor() { return this.nfrest('GET', '/model/colors/selsolid')};
    set selSolidColor(value) { return this.nfrest('POST', '/model/colors/selsolid', {heads: {val: String(value)}}) };
    get selSpringColor() { return this.nfrest('GET', '/model/colors/node')};
    set selSpringColor(value) { return this.nfrest('POST', '/model/colors/node', {heads: {val: String(value)}}) };
    get solidColor() { return this.nfrest('GET', '/model/colors/solid')};
    set solidColor(value) { return this.nfrest('POST', '/model/colors/solid', {heads: {val: String(value)}}) };
    get solverType() { return this.nfrest('GET', '/op/opt/solvertype')};
    get springColor() { return this.nfrest('GET', '/model/colors/spring')};
    set springColor(value) { return this.nfrest('POST', '/model/colors/spring', {heads: {val: String(value)}}) };
    get tableSeparator() { return this.nfrest('GET', '/op/opt/separator')};
    set tableSeparator(value) { return this.nfrest('POST', '/op/opt/separator', {heads: {val: String(value)}}) };
    get tempFolder() { return this.nfrest('GET', '/op/opt/tempfolder')};
    set tempFolder(value) { return this.nfrest('POST', '/op/opt/tempfolder', {heads: {val: String(value)}}) };
    get textColor() { return this.nfrest('GET', '/model/colors/text')};
    set textColor(value) { return this.nfrest('POST', '/model/colors/text', {heads: {val: String(value)}}) };
    get useFastEigensolver() { return this.nfrest('GET', '/op/opt/os/fasteigen')};
    set useFastEigensolver(value) { return this.nfrest('POST', '/op/opt/os/fasteigen', {heads: {val: String(value)}}) };
    get WallMeshSize() { return this.nfrest('GET', '/op/opt/wallmeshsize')};
    set WallMeshSize(value) { return this.nfrest('POST', '/op/opt/wallmeshsize', {heads: {val: String(value)}}) };
}
// export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NextFEMrest, vert3 };
}
