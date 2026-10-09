import * as THREE from "three";

/**
 * A soft photo-studio environment for reflections: a white-to-grey gradient
 * dome plus a few emissive softboxes. Rendered once into a PMREM.
 *
 * Why not three's RoomEnvironment: its room has dark boxes in it, and the
 * device's chrome pillar mirrors them as hard black stripes. Chrome only ever
 * shows what it reflects, so the fix is a cleaner room, not a material hack.
 */
export class StudioEnvironment extends THREE.Scene {
  constructor() {
    super();

    // Gradient dome: bright overhead, light grey floor. Vertex colours keep it
    // to one draw with no texture.
    const dome = new THREE.SphereGeometry(10, 48, 24);
    const colours: number[] = [];
    const position = dome.getAttribute("position");
    const top = new THREE.Color(1, 1, 1);
    const horizon = new THREE.Color(0.86, 0.87, 0.89);
    const floor = new THREE.Color(0.62, 0.63, 0.65);
    const blended = new THREE.Color();
    for (let index = 0; index < position.count; index++) {
      const height = position.getY(index) / 10;
      if (height >= 0) blended.lerpColors(horizon, top, height);
      else blended.lerpColors(horizon, floor, -height);
      colours.push(blended.r, blended.g, blended.b);
    }
    dome.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
    this.add(
      new THREE.Mesh(
        dome,
        new THREE.MeshBasicMaterial({
          vertexColors: true,
          side: THREE.BackSide,
        })
      )
    );

    // Softboxes. Values above 1 are fine: PMREM renders to a half-float
    // target, so these read as lights brighter than the dome.
    const addSoftbox = (
      width: number,
      height: number,
      intensity: number,
      position: [number, number, number]
    ) => {
      const softbox = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(1, 1, 1).multiplyScalar(intensity),
          side: THREE.DoubleSide,
        })
      );
      softbox.position.set(...position);
      softbox.lookAt(0, 0, 0);
      this.add(softbox);
    };

    // Large key overhead-front, and two tall strips either side that lay
    // clean vertical highlights down cylindrical chrome.
    addSoftbox(8, 4, 2.4, [0, 7, 4]);
    addSoftbox(1.6, 7, 1.6, [-7, 1.5, 2]);
    addSoftbox(1.6, 7, 1.3, [7, 1.5, -1]);
  }

  dispose() {
    this.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    });
  }
}
