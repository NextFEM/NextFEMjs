// Example of using NextFEM JavaScript wrapper
// This file shows how to use the NextFEMrest class to interface with NextFEM Designer

const { NextFEMrest, vert3 } = require('./nextfem.js');

// Example 1: Create a simply supported beam
async function exampleSimpleBeam() {
    console.log('=== Example 1: Simply supported beam ===\n');
    
    // Create an instance of the API client
    const api = new NextFEMrest();
    
    try {
        // Create a new model
        await api.newModel();
        console.log('✓ Model created');
        
        // Add a rectangular section (b=0.2m, h=0.4m)
        const sectID = await api.addRectSection(0.2, 0.4);
        console.log('✓ Section created:', sectID);
        
        // Add a material (steel)
        // E = 210000 MPa, ni = 0.3, Wden = 78.5 kN/m³
        const matID = await api.addIsoMaterial('Steel', 210000, 0.3, 78.5);
        console.log('✓ Material created:', matID);
        
        // Add nodes (3 nodes for a simple beam)
        const n1 = await api.addNode(0, 0, 0);      // Left node
        const n2 = await api.addNode(5, 0, 0);      // Right node
        console.log('✓ Nodes created:', n1, n2);
        
        // Add supports (hinges at both ends)
        await api.setBC(n1, true, true, true, true, false, false);  // Hinge
        await api.setBC(n2, true, true, true, true, false, false);  // Hinge
        console.log('✓ Supports added');
        
        // Add a beam element
        const elemID = await api.addBeamWithID(n1, n2, 1, sectID, matID);
        console.log('✓ Beam element created:', elemID);
        
        // Add a load case
        await api.addLoadCase('Gravity');
        console.log('✓ Load case created');
        
        // Add a uniform load (10 kN/m, negative Y direction)
        await api.addBeamLoadU(1, -10, 2, 'Gravity', false);
        console.log('✓ Distributed load added');
        
        // Save the model
        await api.saveModel('simple_beam.nxf');
        console.log('✓ Model saved: simple_beam.nxf');
        
        // Run the analysis
        const result = await api.RunModel();
        if (result === '') {
            console.log('✓ Analysis completed successfully');
            
            // Get results
            const disp_y = await api.getNodalDisp(n1, 'Gravity', '1', 2);
            console.log('✓ Displacement at node 1 (Y):', disp_y);
            
            const force = await api.getBeamForce(1, 'Gravity', '1', 5, 3); // Moment at section 3
            console.log('✓ Moment at section 3:', force);
        } else {
            console.log('✗ Analysis error:', result);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Sample 2
async function exampleFrame2D() {
    console.log('\n=== Sample 2: 2D frame ===\n');
    
    const api = new NextFEMrest();
    
    try {
        await api.newModel();
        
        // Simple frame
        // 
        //  n3 -------- n4
        //  |           |
        //  |           |
        //  n1 -------- n2
        
        // Create the section
        const sectID = await api.addRectSection(0.3, 0.5);
        const matID = await api.addIsoMaterial('Concrete', 30000, 0.2, 24);
        
        // Create nodes
        const n1 = await api.addNode(0, 0, 0);
        const n2 = await api.addNode(5, 0, 0);
        const n3 = await api.addNode(0, 3, 0);
        const n4 = await api.addNode(5, 3, 0);
        
        console.log('✓ Nodes created:', n1, n2, n3, n4);
        
        // Add supports (fixed at base)
        await api.setBC(n1, true, true, true, true, true, true);
        await api.setBC(n2, true, true, true, true, true, true);
        
        // Create elements
        await api.addBeamWithID(n1, n3, 1, sectID, matID);  // Left column
        await api.addBeamWithID(n2, n4, 2, sectID, matID);  // Right column
        await api.addBeamWithID(n3, n4, 3, sectID, matID);  // Top beam
        
        console.log('✓ Elements created');
        
        // Add loads
        await api.addLoadCase('Design');
        
        // Load on top beam (distributed load)
        await api.addBeamLoadU(3, -50, 2, 'Design', false);
        
        // Concentrated load on right column
        await api.addNodalLoad(n4, -20, 1, 'Design', false);
        
        console.log('✓ Loads added');
        
        // Save and run
        await api.saveModel('frame_2d.nxf');
        await api.RunModel();
        
        console.log('✓ Analysis completed');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example 3
async function exampleGetVersion() {
    console.log('\n=== Sample 3: API version ===\n');
    
    const api = new NextFEMrest();
    
    try {
        const version = await api.getVersion();
        console.log('✓ API version:', version);
        
        const loadcases = await api.getLoadCases();
        console.log('✓ Available load cases:', loadcases);
        
        const materials = await api.getDefinedMaterials();
        console.log('✓ Defined materials:', materials);
        
        const sections = await api.getDefinedSections();
        console.log('✓ Defined sections:', sections);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run all examples
async function runAll() {
    await exampleSimpleBeam();
    await exampleFrame2D();
    await exampleGetVersion();
}

// Execute runAll if this script is run directly
if (require.main === module) {
    runAll().catch(console.error);
}

// Export
module.exports = {
    exampleSimpleBeam,
    exampleFrame2D,
    exampleGetVersion
};
