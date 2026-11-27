/** Draws a small "scanned" page (heading, paragraph, table, list, mixed scripts) so the demo works without a file. */
export async function makeSamplePage(): Promise<Uint8Array> {
  const W = 1100
  const H = 1400
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!

  g.fillStyle = '#f6f3ea'
  g.fillRect(0, 0, W, H)

  // slight skew, like a flatbed scan
  g.translate(W / 2, H / 2)
  g.rotate((0.5 * Math.PI) / 180)
  g.translate(-W / 2, -H / 2)

  g.fillStyle = '#1b1b1b'
  g.textBaseline = 'alphabetic'

  g.font = 'bold 52px Georgia, serif'
  g.fillText('Quarterly Field Report', 90, 150)
  g.fillStyle = '#555'
  g.font = 'italic 26px Georgia, serif'
  g.fillText('Prepared by the Operations Team, October 2026', 90, 195)
  g.strokeStyle = '#1b1b1b'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(90, 220)
  g.lineTo(W - 90, 220)
  g.stroke()

  g.fillStyle = '#1b1b1b'
  g.font = '30px Georgia, serif'
  const para = [
    'Deliveries rose in every region this quarter, driven mostly by the',
    'new coastal routes. Costs per parcel fell while customer ratings',
    'stayed above four stars. Detailed figures are shown below.',
  ]
  para.forEach((t, i) => g.fillText(t, 90, 285 + i * 46))

  // table
  const rows = [
    ['Region', 'Parcels', 'Revenue', 'Rating'],
    ['North', '12,480', '$184,200', '4.6'],
    ['Coastal', '18,930', '$271,950', '4.8'],
    ['Central', '9,115', '$128,400', '4.3'],
    ['South', '14,760', '$203,100', '4.5'],
  ]
  const x0 = 90
  const y0 = 470
  const colW = [300, 230, 260, 130]
  const rowH = 62
  const tw = colW.reduce((a, b) => a + b, 0)
  g.lineWidth = 2
  g.strokeRect(x0, y0, tw, rowH * rows.length)
  g.fillStyle = '#e4e0d2'
  g.fillRect(x0 + 1, y0 + 1, tw - 2, rowH - 2)
  g.fillStyle = '#1b1b1b'
  rows.forEach((r, ri) => {
    let x = x0
    r.forEach((cell, ci) => {
      g.font = `${ri === 0 ? 'bold ' : ''}30px Georgia, serif`
      g.fillText(cell, x + 18, y0 + ri * rowH + 42)
      if (ri > 0 || ci > 0) {
        g.beginPath()
        g.moveTo(x, y0)
        g.lineTo(x, y0 + rowH * rows.length)
        g.stroke()
      }
      x += colW[ci]
    })
    g.beginPath()
    g.moveTo(x0, y0 + ri * rowH)
    g.lineTo(x0 + tw, y0 + ri * rowH)
    g.stroke()
  })

  g.font = 'bold 38px Georgia, serif'
  g.fillText('Next steps', 90, 880)
  g.font = '30px Georgia, serif'
  ;[
    '1.  Extend the coastal routes to two more depots.',
    '2.  Review driver schedules in the Central region.',
    '3.  Publish the full dataset to the shared drive.',
  ].forEach((t, i) => g.fillText(t, 110, 940 + i * 50))

  // one script per line: the router picks a recognizer per text line
  g.fillStyle = '#555'
  g.font = '30px Georgia, serif'
  g.fillText('Thank you / Merci beaucoup', 90, 1170)
  g.fillText('ありがとうございました', 90, 1225)
  g.fillText('Большое спасибо', 90, 1280)

  // scanner noise
  const img = g.getImageData(0, 0, W, H)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.putImageData(img, 0, 0)

  const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png'))
  return new Uint8Array(await blob.arrayBuffer())
}
