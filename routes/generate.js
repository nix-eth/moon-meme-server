import { createCanvas, loadImage } from 'canvas'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { createHash } from 'crypto'

const APP_PATH = path.dirname(fileURLToPath(import.meta.url))
const CACHE_PATH = path.join(APP_PATH, '../', 'cache')
const ASSETS_PATH = path.join(APP_PATH, '../', 'assets')

async function routes(fastify) {
  fastify.get('/:memeId/:birbId.png', async (request, reply) => {
    let { memeId, birbId } = request.params
    let config

    if (isNaN(birbId) || birbId < 0 || birbId > 9999) {
      reply.code(404)
      reply.send('Moonbird not found')
      return
    }

    reply.headers({
      'Cache-Control': 'public, max-age=604800'
    })

    try {
      config = JSON.parse(
        await readFile(
          path.join(CACHE_PATH, 'configs', `${memeId}.json`),
          'utf8'
        )
      )
    } catch (err) {
      reply.code(404)
      reply.send('Meme not found')
      return
    }

    const memeHash = createHash('sha256')
      .update(`${memeId}:${birbId}`)
      .digest('hex')

    const memeCachePath = path.join(CACHE_PATH, 'memes', `${memeHash}.png`)

    if (existsSync(memeCachePath)) {
      reply.type('image/png')
      reply.send(await readFile(memeCachePath))
      return
    }

    const backgroundImage = await loadImage(
      path.join(CACHE_PATH, 'backgrounds', config.background)
    )

    let spriteY = 0

    const [styleAction, styleDirection, styleVariant] =
      config.birds[0].style.split('_')

    if (styleAction === 'walk') {
      spriteY = 192
    }

    switch (styleDirection) {
      case 'east':
        spriteY += 48
        break
      case 'north':
        spriteY += 96
        break
      case 'west':
        spriteY += 144
        break
    }

    const spriteX = ((styleVariant || 1) - 1) * 48

    const birdImage = await loadImage(
      path.join(ASSETS_PATH, 'birds', `${birbId}_sheet.png`)
    )
    const canvas = createCanvas(backgroundImage.width, backgroundImage.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(backgroundImage, 0, 0)

    if (config.birds[0].rotate) {
      ctx.translate(
        config.birds[0].x + config.birds[0].size / 2,
        config.birds[0].y + config.birds[0].size / 2
      )
      ctx.rotate((config.birds[0].rotate * Math.PI) / 180)

      const birbCanvas = createCanvas(
        config.birds[0].size,
        config.birds[0].size
      )
      const birbCtx = birbCanvas.getContext('2d')
      birbCtx.imageSmoothingEnabled = false
      birbCtx.drawImage(
        birdImage,
        spriteX,
        spriteY,
        48,
        48,
        0,
        0,
        config.birds[0].size,
        config.birds[0].size
      )

      ctx.drawImage(
        birbCanvas,
        -config.birds[0].size / 2,
        -config.birds[0].size / 2,
        config.birds[0].size,
        config.birds[0].size
      )

      ctx.resetTransform()
    } else {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        birdImage,
        spriteX,
        spriteY,
        48,
        48,
        config.birds[0].x,
        config.birds[0].y,
        config.birds[0].size,
        config.birds[0].size
      )
    }

    if (config.foreground) {
      //todo: what about rotating?
      const foregroundImage = await loadImage(
        path.join(CACHE_PATH, 'foregrounds', config.foreground)
      )
      ctx.drawImage(foregroundImage, 0, 0)
    }

    const buffer = canvas.toBuffer('image/png')
    writeFile(memeCachePath, buffer)
    reply.type('image/png')
    reply.send(buffer)
  })
}

export default routes
