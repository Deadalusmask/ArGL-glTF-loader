//import { ArGL, Camera, Shader } from 'argl'
import ArGL from './argl/argl'
import Camera from './argl/camera'
import { loadBinary } from './argl/util'

import * as glm from 'gl-matrix'

import GLTFLoader from './GLTFLoader'

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
    lockPointer: true
  }
})
document.body.appendChild(argl.el)

let gl = argl.gl
gl.enable(gl.DEPTH_TEST)
gl.enable(gl.CULL_FACE)

let camera = new Camera(glm.vec3.fromValues(0.0, 0.0, 5.0))

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

  let view, projection

  argl.start()
  gl.clearColor(0, 0, 0, 1)

  argl.draw = (time) => {

    camera.desktopFreeMoveControl(argl)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    view = camera.getViewMatrix()
    projection = glm.mat4.create()
    glm.mat4.perspective(projection, glm.glMatrix.toRadian(camera.zoom), gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 100)

    scene.nodes.forEach(node => {
      let modelMatrix = glm.mat4.create()
      glm.mat4.scale(modelMatrix, modelMatrix, [100, 100, 100])
      renderNode(node, modelMatrix)
    })

    function renderNode(node, modelMatrix) {
      glm.mat4.mul(modelMatrix, modelMatrix, node.matrix)
      if (loader.animations !== undefined) {
        loader.animations.forEach(animation => {
          animation.channels.forEach(channel => {
            if (node.id === channel.target.node.id) {
              let duration = channel.sampler.input.max[0] - channel.sampler.input.min[0]
              let currentValue = loader.getCurrentValue(time / 1000 % duration, channel.sampler)

              if (channel.target.path === 'scale') {
                glm.mat4.scale(modelMatrix, modelMatrix, currentValue)
              } else if (channel.target.path === 'translation') {
                glm.mat4.translate(modelMatrix, modelMatrix, currentValue)
              } else if (channel.target.path === 'rotation') {
                let rotateAni = glm.mat4.create()
                glm.mat4.fromQuat(rotateAni, currentValue)
                glm.mat4.mul(modelMatrix, modelMatrix, rotateAni)
              }
            }
          })
        })
      }
      if (node.mesh !== undefined) {
        let mvMatrix = glm.mat4.create()
        let mvpMatrix = glm.mat4.create()
        glm.mat4.multiply(mvMatrix, view, modelMatrix)
        glm.mat4.multiply(mvpMatrix, projection, mvMatrix)
        let modelInverse = glm.mat4.create()
        let normalMatrix = glm.mat4.create()
        glm.mat4.invert(modelInverse, modelMatrix)
        glm.mat4.transpose(normalMatrix, modelInverse)

        node.mesh.primitives.forEach(primitive => {
          primitive.shader.use()
          primitive.shader.setVec3('u_LightDirection', [3, 5, 4])
          primitive.shader.setVec3('u_LightColor', [1, 1, 1])
          primitive.shader.setVec3('u_Camera', camera.position)
          primitive.shader.setMat4('u_MVPMatrix', mvpMatrix)
          primitive.shader.setMat4('u_ModelMatrix', modelMatrix)
          primitive.shader.setMat4('u_NormalMatrix', normalMatrix)

          if (primitive.material !== undefined) {
            loader.useMaterial(primitive.material, gl, primitive.shader)
          }
          gl.bindVertexArray(primitive.vao)
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primitive.indices.buffer)
          gl.drawElements(gl.TRIANGLES, primitive.indices.count, primitive.indices.componentType, 0)
        })
      }
      if (node.children !== undefined) {
        node.children.forEach(child => {
          let childmodelMatrix = glm.mat4.create()
          glm.mat4.copy(childmodelMatrix, modelMatrix)
          renderNode(child, childmodelMatrix)
        })
      }
    }
  }
}
start()

