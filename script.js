var canvas = document.getElementById("renderCanvas");
var panel;
var repoLinks = [];
var repoNames = [];
var projectManagerPanel;
var projectButtonsPanel;

var startRenderLoop = function (engine, canvas) {
    engine.runRenderLoop(function () {
        if (sceneToRender && sceneToRender.activeCamera) {
            sceneToRender.render();
        }
    });
}

var engine = null;
var scene = null;
var sceneToRender = null;
var createDefaultEngine = function () { return new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false }); };
async function createScene() {
    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // This creates and positions a universal camera (non-mesh)
    var camera = new BABYLON.UniversalCamera("Camera1", new BABYLON.Vector3(0, 4, 0), scene);

    // This targets the camera to look outward
    camera.setTarget(new BABYLON.Vector3(0, 4, 10));

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;

    // Our built-in 'ground' shape.
    var ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 25, height: 25 }, scene);
    let groundMaterial = new BABYLON.StandardMaterial("Ground Material", scene);
    ground.material = groundMaterial;
    let groundTexture = new BABYLON.Texture("./textures/albedo.png");
    ground.material.diffuseTexture = groundTexture;

    // GUI ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //Read from repoLinks file
    fetch("repoLinks.txt").then(response => response.text()).then(data => {
        repoLinks = data.split("\n").filter(link => link.trim() !== "");
        console.log(repoLinks);
    }).catch(error => console.error("Error reading file: ", error));

    //Read from repoNames file
    fetch("repoNames.txt").then(response => response.text()).then(data => {
        repoNames = data.split("\n").filter(name => name.trim() !== "");
        console.log(repoNames);
        processNameLines(repoNames);
    }).catch(error => console.error("Error reading file: ", error));

    function processNameLines(nameLines) {
        // Check localStorage for backup data
        const savedNames = localStorage.getItem('repoNames');
        const savedLinks = localStorage.getItem('repoLinks');
        
        if (savedNames && savedLinks) {
            repoNames = JSON.parse(savedNames);
            repoLinks = JSON.parse(savedLinks);
        }

        // Create 2D GUI manager for the management panel
        var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        
        // Create management panel for adding new projects
        projectManagerPanel = new BABYLON.GUI.StackPanel();
        projectManagerPanel.width = "300px";
        projectManagerPanel.height = "200px";
        projectManagerPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        projectManagerPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        projectManagerPanel.paddingTop = "20px";
        projectManagerPanel.paddingRight = "20px";
        advancedTexture.addControl(projectManagerPanel);

        // Add form elements
        var nameInput = new BABYLON.GUI.InputText();
        nameInput.width = "200px";
        nameInput.height = "40px";
        nameInput.placeholderText = "Project Name";
        nameInput.background = "white";
        nameInput.color = "black";
        nameInput.focusedBackground = "white";
        nameInput.focusedColor = "black";
        nameInput.hoveredBackground = "white";
        nameInput.hoveredColor = "black";
        projectManagerPanel.addControl(nameInput);

        var linkInput = new BABYLON.GUI.InputText();
        linkInput.width = "200px";
        linkInput.height = "40px";
        linkInput.placeholderText = "Project Link";
        linkInput.background = "white";
        linkInput.color = "black";
        linkInput.focusedBackground = "white";
        linkInput.focusedColor = "black";
        linkInput.hoveredBackground = "white";
        linkInput.hoveredColor = "black";
        projectManagerPanel.addControl(linkInput);

        var addButton = BABYLON.GUI.Button.CreateSimpleButton("addButton", "Add Project");
        addButton.width = "200px";
        addButton.height = "40px";
        addButton.color = "white";
        addButton.background = "green";
        addButton.onPointerClickObservable.add(() => {
            const name = nameInput.text;
            const link = linkInput.text;
            if (name && link) {
                addNewProject(name, link);
                nameInput.text = "";
                linkInput.text = "";
            }
        });
        projectManagerPanel.addControl(addButton);

        // Create 3D GUI manager for the holographic buttons
        var manager = new BABYLON.GUI.GUI3DManager(scene);
        
        // Create main panel for project buttons
        projectButtonsPanel = new BABYLON.GUI.PlanePanel();
        projectButtonsPanel.margin = 0.2;
        manager.addControl(projectButtonsPanel);
        
        // Create an anchor for the panel
        var anchor = new BABYLON.TransformNode("anchor");
        projectButtonsPanel.linkToTransformNode(anchor);
        projectButtonsPanel.position.z = 12; // Move panel further back
        projectButtonsPanel.position.y = 4; // Lower the panel height
        projectButtonsPanel.position.x = 0; // Center the panel
        projectButtonsPanel.rotation = new BABYLON.Vector3(0, Math.PI, 0); // Make panel face the camera

        // Create 16 fixed position buttons (2 rows of 8)
        for (let i = 0; i < 30; i++) {
            addHolographicButton(i < nameLines.length ? nameLines[i] : "", i);
        }
    }

    function addNewProject(name, link) {
        // Add to arrays
        repoNames.push(name);
        repoLinks.push(link);

        // Update the button at the current index
        const index = repoNames.length - 1;
        if (index < 16) { // Allow up to 16 projects (2 rows)
            updateHolographicButton(index, name);
        }

        // Update files
        updateFiles();
    }

    function updateHolographicButton(index, name) {
        const button = projectButtonsPanel.children[index];
        if (button) {
            button.text = name;
        }
    }

    function updateFiles() {
        // Update repoNames.txt
        fetch("repoNames.txt", {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: repoNames.join('\n')
        }).catch(error => {
            console.error("Error updating names file: ", error);
            // Store in localStorage as backup
            localStorage.setItem('repoNames', JSON.stringify(repoNames));
        });

        // Update repoLinks.txt
        fetch("repoLinks.txt", {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: repoLinks.join('\n')
        }).catch(error => {
            console.error("Error updating links file: ", error);
            // Store in localStorage as backup
            localStorage.setItem('repoLinks', JSON.stringify(repoLinks));
        });
    }

    //Function to add a holographic button to the GUI
    function addHolographicButton(name, index) {
        var button = new BABYLON.GUI.HolographicButton("button" + index);
        button.text = name;
        button.scale = 0.6; // Make buttons slightly smaller to fit better
        
        // Calculate fixed position for each button
        const spacing = 1.0; // Space between buttons
        const rowSpacing = 1.2; // Space between rows
        const startX = -3.5; // Starting X position
        const startY = 0.5; // Starting Y position for first row
        
        // Calculate row and column
        const row = Math.floor(index / 8);
        const col = index % 8;
        
        // Position button based on row and column
        button.position = new BABYLON.Vector3(
            startX + (col * spacing), // X position based on column
            startY - (row * rowSpacing), // Y position based on row
            0
        );

        // Add hover animation
        button.onPointerEnterObservable.add(() => {
            BABYLON.Animation.CreateAndStartAnimation(
                "hoverAnimation" + index,
                button,
                "scale",
                30,
                10,
                button.scale,
                0.8,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
        });

        // Add hover out animation
        button.onPointerOutObservable.add(() => {
            BABYLON.Animation.CreateAndStartAnimation(
                "hoverOutAnimation" + index,
                button,
                "scale",
                30,
                10,
                button.scale,
                0.6,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
        });

        // Add click animation
        button.onPointerClickObservable.add(function () {
            // Scale down animation
            BABYLON.Animation.CreateAndStartAnimation(
                "clickAnimation" + index,
                button,
                "scale",
                30,
                5,
                button.scale,
                0.4,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            // Scale up animation
            BABYLON.Animation.CreateAndStartAnimation(
                "clickUpAnimation" + index,
                button,
                "scale",
                30,
                5,
                0.4,
                0.6,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            // Open link after animation
            setTimeout(() => {
                console.log("Button #" + index + " clicked");
                if (repoLinks[index]) {
                    window.open(repoLinks[index], '_blank');
                } else {
                    console.log("No linked repo");
                }
            }, 200); // Wait for animation to complete
        });

        // Add floating animation
        BABYLON.Animation.CreateAndStartAnimation(
            "floatAnimation" + index,
            button,
            "position.y",
            30,
            2000,
            button.position.y,
            button.position.y + 0.1,
            BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE
        );

        projectButtonsPanel.addControl(button);
    }
    // GUI ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // PHYSICS ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // Initialize Havok Physics plugin
    // initialize plugin
    var havokInstance = await HavokPhysics();
    var hk = new BABYLON.HavokPlugin(true, havokInstance);
    // enable physics in the scene with a gravity
    scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), hk);

    // Create a static box shape for the ground
    var groundAggregate = new BABYLON.PhysicsAggregate(ground, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, scene);
    // PHYSICS ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    //Skybox
    var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyboxMaterial;

    // Create default environment
    scene.createDefaultEnvironment();

    return scene;
};

window.initFunction = async function () {
    var asyncEngineCreation = async function () {
        try {
            return createDefaultEngine();
        } catch (e) {
            console.log("the available createEngine function failed. Creating the default engine instead");
            return createDefaultEngine();
        }
    }

    window.engine = await asyncEngineCreation();
    if (!engine) throw 'engine should not be null.';
    startRenderLoop(engine, canvas);
    window.scene = await createScene();
};
initFunction().then(() => {
    sceneToRender = scene
});

// Resize
window.addEventListener("resize", function () {
    engine.resize();
});