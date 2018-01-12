const fs = require("fs");
const path = require("path");
const decodeMsAdpcm = require("../");

function readWav(filename) {
  const buf = fs.readFileSync(filename);
  let offset = 0;

  // 'RIFF'
  const magic = buf.readUInt32BE(offset); offset += 4;
  if(magic !== 0x52494646) throw "0x0000:0x0004 != 52:49:46:46";

  const dataSize = buf.readUInt32LE(offset); offset += 4;

  // 'WAVE'
  const format = buf.readUInt32BE(offset); offset += 4;
  if(format !== 0x57415645) throw "0x0008:0x000B != 57:41:56:45";

  let wavFormat, wavData;

  while(offset < buf.length) {
    const name = buf.readUInt32BE(offset); offset += 4;
    const blockSize = buf.readUInt32LE(offset); offset += 4;

    // 'fmt '
    if(name === 0x666D7420) {
      wavFormat = {
        format:        buf.readUInt16LE(offset +  0),
        channels:      buf.readUInt16LE(offset +  2),
        sampleRate:    buf.readUInt32LE(offset +  4),
        byteRate:      buf.readUInt32LE(offset +  8),
        blockAlign:    buf.readUInt16LE(offset + 12),
        bitsPerSample: buf.readUInt16LE(offset + 14),
      };

      offset += 16;

      if(wavFormat.format === 0x01) {
        console.log(`${filename} is PCM file`);
        continue;
      }
      else if(wavFormat.format === 0x02) {
        console.log(`${filename} is MS-ADPCM file`);

        const extraSize = buf.readUInt16LE(offset); offset += 2;
        wavFormat.extraSize = extraSize;
        wavFormat.extra = {
          samplesPerBlock:  buf.readUInt16LE(offset + 0),
          coefficientCount: buf.readUInt16LE(offset + 2),
          coefficient: [ [], [] ],
        };

        offset += 4;

        for(let i = 0 ; i < wavFormat.extra.coefficientCount ; i++) {
          wavFormat.extra.coefficient[0].push(buf.readInt16LE(offset + 0));
          wavFormat.extra.coefficient[1].push(buf.readInt16LE(offset + 2));
          offset += 4;
        }
      }
      else throw `WAVE format ${wavFormat.format} is unknown`;
    }
    // 'data'
    else if(name === 0x64617461) {
      wavData = buf.slice(offset, offset + blockSize);
      offset += blockSize;
    }
    else {
      offset += blockSize;
    }
  }

  if(wavFormat && wavData) return { format: wavFormat, data: wavData };
  else throw "'fmt ' or/and 'data' block not found";
}

function compare(adpcmFile, pcmFile) {
  const adpcmData = readWav(adpcmFile);
  const   pcmData = readWav(pcmFile);
  let pcmOffset = 0;

  console.log(adpcmData.format.extra);

  if(pcmData.format.format !== 1) throw `${pcmFile} is not PCM file`;
  if(adpcmData.format.format !== 2) throw `${adpcmFile} is not MS-ADPCM file`;

  const blockSize = adpcmData.format.blockAlign;

  for(let i = 0 ; i < adpcmData.data.length ; i += blockSize) {
    const blockNo = i / blockSize;
    const adpcmBlock = adpcmData.data.slice(i, i + blockSize);
    const decoded = decodeMsAdpcm(
      adpcmBlock,
      adpcmData.format.channels,
      adpcmData.format.extra.coefficient[0],
      adpcmData.format.extra.coefficient[1]
    );

    // console.log(`${blockSize} bytes of block decoded into ${decoded[0].length} samples in ${decoded.length} channels`);

    const pcmBlockSize = decoded[0].length * 2;
    const actual = Buffer.alloc(decoded.length * pcmBlockSize);
    let offset = 0;

    for(let s = 0 ; s < pcmBlockSize / 2 ; s++) {
      for(let c = 0 ; c < decoded.length ; c++) {
        actual.writeInt16LE(decoded[c][s], offset);
        offset += 2;
      }
    }

    // Compare two blocks
    const expected = pcmData.data.slice(pcmOffset, pcmOffset + actual.length);
    pcmOffset += actual.length;

    const compare = Buffer.compare(expected, actual);
    if(compare !== 0) {
      // console.log(expected.length, actual.length);
      // console.log(expected.toString("base64"));
      // console.log(actual.toString("base64"));
      throw `Block mismatch at block #${(blockNo + 1)}`;
    }
  }

  console.log("Decoder is correct, maybe");
}

if(process.argv.length < 4)
  throw `${process.argv[0]} ${process.argv[1]} adpcm.wav pcm.wav`;

compare(process.argv[2], process.argv[3]);
