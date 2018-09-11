//import { ArGL, Camera, Shader } from 'argl'
import ArGL from './argl/argl'
// import FreeMoveCamera from './argl/camera/free-move-camrea'
import OrbitCamera from './argl/camera/orbit-camera'
import { loadBinary } from './argl/util'

import * as glm from 'gl-matrix'

import GLTFLoader from './GLTFLoader'

// import suzanne from './gltf/axis/axis.gltf'
// import suzanne_bin from './gltf/axis/axis.bin'

import suzanne from './gltf/BoomBox/BoomBoxWithAxes.gltf'
import suzanne_bin from './gltf/BoomBox/BoomBoxWithAxes.bin'

import baseColor from './gltf/BoomBox/BoomBoxWithAxes_baseColor.png'
import baseColor1 from './gltf/BoomBox/BoomBoxWithAxes_baseColor1.png'
import emissive from './gltf/BoomBox/BoomBoxWithAxes_emissive.png'
import normal from './gltf/BoomBox/BoomBoxWithAxes_normal.png'
import roughnessMetallic from './gltf/BoomBox/BoomBoxWithAxes_roughnessMetallic.png'

let argl = new ArGL({
  width: 960,
  height: 540,
  desktopInput: {
    lockPointer: false
  }
})
document.body.appendChild(argl.el)

let gl = argl.gl
gl.enable(gl.DEPTH_TEST)
gl.enable(gl.CULL_FACE)

// let camera = new FreeMoveCamera([0.0, 0.0, 5.0], [0, 1, 0, 0])
let camera = new OrbitCamera([0, 0, 5], [0, 0, 0], [0, 1, 0, 0])


async function start() {
  let bin = await loadBinary(suzanne_bin, () => { })
  let images = [baseColor, roughnessMetallic, normal, emissive, baseColor1]
  let promises = images.map((element, index) => {
    return ArGL.loadImage(element, () => { })
  })
  let loadedImgs = await Promise.all(promises)
  let loader = new GLTFLoader(suzanne, [bin], loadedImgs)

  let scene = loader.loadScene(0)
  loader.initScene(scene, gl)

  console.log('scene:', scene)

  if (loader.animations !== undefined) {
    loader.animations.forEach((v, i) => {
      loader.loadAnimation(i, scene)
    })
  }

  argl.start()
  gl.clearColor(0, 0, 0, 1)

  argl.draw = (time) => {
    camera.orbitControl(argl)
    // let step = argl.deltaTime * 0.005
    // camera.desktopFreeMoveControl(argl.currentlyPressedKeys, step, argl.mouseInput, 0.05)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    let transform = glm.mat4.create()
    glm.mat4.scale(transform, transform, [100, 100, 100])
    loader.renderScene(gl, scene, camera, transform)
  }

}
start()
