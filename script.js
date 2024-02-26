var canvas = document.getElementById("renderCanvas");

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

    // Our built-in 'sphere' shape.
    var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 0.7, segments: 32 }, scene);
    let sphereMaterial = new BABYLON.StandardMaterial("Sphere Material", scene);
    sphere.material = sphereMaterial;
    let sphereTexture = new BABYLON.Texture("./textures/rockn.png", scene);
    sphere.material.diffuseTexture = sphereTexture;
    sphere.position.y = 6;
    sphere.position.z = 5;
    var hl = new BABYLON.HighlightLayer("hl1", scene);
	hl.addMesh(sphere, BABYLON.Color3.Green()); //Could probably use this with a mouse cursor hover selection functionality.

    // Create a cylinder
    const cylinder = BABYLON.MeshBuilder.CreateCylinder("cylinder", { height: 2.5 });
    let cylinderMaterial = new BABYLON.StandardMaterial("Cylinder Material", scene);
    cylinder.material = cylinderMaterial;
    let cylinderTexture = new BABYLON.Texture("./textures/amiga.jpg", scene);
    cylinder.material.diffuseTexture = cylinderTexture;
    cylinder.position.y = 1.25;
    cylinder.position.z = 5;

    // Our built-in 'ground' shape.
    var ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 30, height: 30 }, scene);
    let groundMaterial = new BABYLON.StandardMaterial("Ground Material", scene);
    ground.material = groundMaterial;
    let groundTexture = new BABYLON.Texture("./textures/albedo.png");
    ground.material.diffuseTexture = groundTexture;

    // GUI ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    var manager = new BABYLON.GUI.GUI3DManager(scene);
    var panel = new BABYLON.GUI.SpherePanel();
    panel.margin = 0.2;
    manager.addControl(panel);
    var anchor = new BABYLON.TransformNode("");
    panel.linkToTransformNode(anchor);
    panel.position.z = 6;
    panel.position.y = 4;
    //Add a button for every link we have. (Complete this functionality later)
    var addButton = function() {
        var button = new BABYLON.GUI.HolographicButton("orientation");
        panel.addControl(button);

        button.text = "Button #" + panel.children.length;
    }
    panel.blockLayout = true;
    for (var index = 0; index < 10; index++) {
        addButton();    
    }
    panel.blockLayout = false;
    // GUI ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // PHYSICS ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //Dragging behavior with either pointer or VR controller
    const pointerDragBehavior = new BABYLON.PointerDragBehavior({ dragAxis: new BABYLON.Vector3(0, 1, 0) });
    pointerDragBehavior.useObjectOrientationForDragging = false;
    pointerDragBehavior.onDragStartObservable.add((event) => {
        console.log("dragStart");
        console.log(event);
    })
    pointerDragBehavior.onDragObservable.add((event) => {
        console.log("drag");
        console.log(event);
    })
    pointerDragBehavior.onDragEndObservable.add((event) => {
        console.log("dragEnd");
        console.log(event);
    })
    sphere.addBehavior(pointerDragBehavior);

    //Restrict camera movement
    scene.onPointerObservable.add((eventData) => {
        // This will block out vertical rotation
        // For blocking out horizontal rotation, simply use y instead of x
        camera.cameraRotation.x = 0;
    });

    // Initialize Havok Physics plugin
    // initialize plugin
    var havokInstance = await HavokPhysics();
    var hk = new BABYLON.HavokPlugin(true, havokInstance);
    // enable physics in the scene with a gravity
    scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), hk);

    // Create a sphere shape and the associated body. Size will be determined automatically.
    var sphereAggregate = new BABYLON.PhysicsAggregate(sphere, BABYLON.PhysicsShapeType.SPHERE, { mass: 1, restitution: 0.6 }, scene);

    // Create a cylinder shape
    var cylinderAggregate = new BABYLON.PhysicsAggregate(cylinder, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0, restitution: 0 }, scene);

    // Create a static box shape.
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

    // Create a particle system and attach to sphere
    const particleSystem = new BABYLON.ParticleSystem("particles", 2000);
    particleSystem.particleTexture = new BABYLON.Texture("./textures/Flare2.png");
    particleSystem.emitter = sphere;
    particleSystem.start();

    // EXTENDED REALITY ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    //WebXR Helpers - Can only be served over HTTPS. Disable this during development.
    scene.createDefaultEnvironment();
    const xrHelper = await scene.createDefaultXRExperienceAsync();

    //Change the camera height in XR
    xrHelper.baseExperience.onStateChangedObservable.add((state) => {
        if (state === BABYLON.WebXRState.IN_XR) {
            scene.activeCamera.position.y = 4;
        }
    });
    // EXTENDED REALITY ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

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