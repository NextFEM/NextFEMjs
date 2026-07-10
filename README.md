# NextFEM REST API - JavaScript Wrapper

This is the `nextfem.js` file - a translation of the Python wrapper `nextfem.py` for the NextFEM REST API into JavaScript/TypeScript.

## Main Features

- **REST Wrapper**: Modern interface to communicate with NextFEM Designer via REST API
- **Async/Await**: All operations support JavaScript promises
- **Browser and Node.js Support**: Compatible with both environments
- **Typed Classes**: Main classes (`NextFEMrest`, `vert3`)

## Usage

### Node.js

```javascript
const { NextFEMrest, vert3 } = require('./nextfem.js');

// Create an instance of the client
const api = new NextFEMrest();

// Example: create a node
(async () => {
    const nodeID = await api.addNode(0, 0, 0);
    console.log('Node created:', nodeID);
    
    // Create a beam element
    const elemID = await api.addBeam('1', '2', 1, 1);
    console.log('Beam created:', elemID);
    
    // Run the analysis
    const result = await api.RunModel();
    console.log('Analysis result:', result);
})();
```

### Browser (HTML)

```html
<!DOCTYPE html>
<html>
<head>
    <script src="nextfem.js"></script>
</head>
<body>
    <script>
        const api = new NextFEMrest();
        
        api.addNode(0, 0, 0).then(nodeID => {
            console.log('Node created:', nodeID);
        });
    </script>
</body>
</html>
```

## Main Classes

### `NextFEMrest`

Main client for communicating with NextFEM Designer.

#### Constructor
```javascript
new NextFEMrest(baseUrl, user, msg)
```
- `baseUrl`: REST API URL (default: `http://localhost:5151`)
- `user`: Username (default: `""`)
- `msg`: Show debug messages (default: `true`)

#### Main Methods

**Model management:**
- `async newModel()` - Create a new model
- `async openModel(filename)` - Open a model
- `async saveModel(filename)` - Save the model
- `async RunModel(outOfProc, noWindow)` - Run the analysis

**Node and element creation:**
- `async addNode(x, y, z, ...)` - Add a node
- `async addNodeWithID(x, y, z, ID)` - Add a node with specific ID
- `async addBeam(n1, n2, sect, mat, sect2)` - Add a beam element
- `async addBeamWithID(n1, n2, ID, sect, mat, sect2)` - Add a beam with ID
- `async addTruss(n1, n2, sect, mat)` - Add a truss element
- `async addQuad(n1, n2, n3, n4, sect, mat)` - Add a quad element
- `async addTria(n1, n2, n3, sect, mat)` - Add a triangular element

**Sections and materials:**
- `async addRectSection(Lz, Ly)` - Add a rectangular section
- `async addCircSection(D)` - Add a circular section
- `async addIsoMaterial(name, E, ni, Wden, ...)` - Add an isotropic material

**Loads:**
- `async addNodalLoad(node, value, direction, loadcase, local)` - Add a nodal load
- `async addBeamLoadU(elem, value, direction, loadcase, local)` - Add a distributed load
- `async addLoadCase(name)` - Add a load case

**Results:**
- `async getBeamForce(num, loadcase, time, type_, station)` - Get beam force
- `async getBeamForces(num, loadcase, station, time)` - Get all forces
- `async getNodalDisp(num, loadcase, time, direction)` - Get nodal displacement
- `async getNodalReact(num, loadcase, time, direction)` - Get nodal reactions
- `async getLoadCases()` - Get available load cases

### `vert3`

Class to represent a 3D vector.

```javascript
const v = new vert3(x, y, z);
const coords = v.toDict(); // { num: "0", X: x, Y: y, Z: z }
```

## Helper Functions

- `sbool(arg)` - Convert "True"/"False" to boolean
- `qt(s)` - URL-encode a string
- `des(s)` - Parse JSON or return string

## Important Notes

1. **Async/Await**: All methods are asynchronous and return Promises
2. **CORS**: If you use the browser, make sure NextFEM is configured for CORS
3. **Errors**: Network errors are logged to console
4. **File system**: File operations require Node.js (don't work in browser)

## Differences from Python version

- Use of `async/await` instead of synchronous calls
- `fetch` API instead of `requests`
- Methods return Promises instead of direct results
- Native browser support

## Extension

To add new methods, follow the pattern:

```javascript
async addNewFeature(param1, param2) {
    return await this.nfrest('GET', '/path/to/endpoint/' + String(param1) + '/' + String(param2) + '');
}
```

## Compatibility

- ✅ Node.js 12+
- ✅ Chrome, Firefox, Safari, Edge (recent versions)
- ✅ NextFEM Designer with REST API Server enabled
