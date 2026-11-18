// QR code em SVG, gerado aqui mesmo (qrcode-generator, MIT, sem dependências), sem rede. Só o roteiro carrega este arquivo (import dinâmico).

import qrcode from 'qrcode-generator';

/** SVG escalável com correção de erro M e margem de 2 módulos. */
export function qrSvg(texto: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  return qr.createSvgTag({ cellSize: 1, margin: 2, scalable: true });
}
