# Third-Party Notices

The PolyForm Noncommercial License in this repository applies only to the
project-authored material identified in `NOTICE`. It does not replace or change
the licenses for third-party components and assets listed here. Check the
upstream license and attribution record before reusing any third-party item.

## Three.js r128 and GLTFLoader

The project bundles Three.js r128 at
`public/vendor/three-r128.min.js` and loads the matching r128 `GLTFLoader.js`
from jsDelivr at runtime. Both are from the Three.js project and are licensed
under the MIT License. The bundled file retains the upstream copyright and
SPDX header. The complete upstream MIT terms are reproduced here:

```text
The MIT License

Copyright © 2010-2021 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

Upstream sources: [Three.js r128 license](https://github.com/mrdoob/three.js/blob/r128/LICENSE) · [Three.js r128 GLTFLoader](https://github.com/mrdoob/three.js/blob/r128/examples/js/loaders/GLTFLoader.js).

## Poly Haven assets — CC0 1.0 Universal

Poly Haven distributes its HDRIs, textures, and models under CC0. These assets
are not covered by this project's PolyForm license:

- **Drill 01**, model by Fernando Quinn: the 1K glTF model and textures are
  included in `public/assets/models/polyhaven-drill-01/`. The accompanying
  `ATTRIBUTION.txt` records the source and license. Attribution is not required
  by CC0, but is retained here for provenance.
- **White Plaster 02** and **Red Brick 03** textures are optional assets loaded
  from Poly Haven URLs at runtime; they are not bundled in this repository.

Sources: [Poly Haven license](https://polyhaven.com/license) · [Drill 01](https://polyhaven.com/a/Drill_01) · [White Plaster 02](https://polyhaven.com/a/white_plaster_02) · [Red Brick 03](https://polyhaven.com/a/red_brick_03).

## Khronos glTF Sample Asset — WaterBottle

The optional WaterBottle glTF model is fetched from the
[Khronos glTF Sample Assets repository](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/WaterBottle)
through jsDelivr. The individual model is marked CC0 1.0 Universal in the
upstream model inventory. It is not covered by this project's PolyForm license.

## License boundaries

CC0 assets can be reused under CC0's terms independently of this project. The
MIT-licensed Three.js component can be reused under its MIT terms. Neither
third-party license grants permission to use Calvin Huang's original project
code for commercial purposes; that code remains under PolyForm Noncommercial
unless the rights holder grants separate permission.
