import { Transform, type TransformCallback } from "node:stream";

const ENTETE_OCTETS = 8;
const TAILLE_MAX_TRAME = 1024 * 1024;

/**
 * Démultiplexe le flux brut Docker (stdout/stderr entrelacés) lorsque le conteneur n’a pas de TTY.
 */
export class DockerLogFrameDemuxStream extends Transform {
  private tampon = Buffer.alloc(0);

  _transform(
    morceau: Buffer,
    _encodage: BufferEncoding,
    suite: TransformCallback,
  ): void {
    try {
      this.tampon = Buffer.concat([this.tampon, morceau]);
      while (this.tampon.length >= ENTETE_OCTETS) {
        const taille = this.tampon.readUInt32BE(4);
        if (taille > TAILLE_MAX_TRAME) {
          suite(
            new Error(
              `Trame de journaux Docker invalide (taille ${taille} octets).`,
            ),
          );
          return;
        }
        if (this.tampon.length < ENTETE_OCTETS + taille) {
          break;
        }
        const charge = this.tampon.subarray(ENTETE_OCTETS, ENTETE_OCTETS + taille);
        this.push(charge);
        this.tampon = this.tampon.subarray(ENTETE_OCTETS + taille);
      }
      suite();
    } catch (error_) {
      suite(error_ as Error);
    }
  }
}
