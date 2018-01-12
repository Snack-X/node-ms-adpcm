# Javascript MS-ADPCM decoder

Something I made a while ago. I'm just dumping it here, maybe someone can use it.

Takes a block of MS-ADPCM buffer, decodes into array of PCM buffer.

`test/index.js` file suggests how to read MS-ADPCM wav files, and how to decode them into nice PCM data.

## Test

I grabbed some CC0 wav files, converted them into MS-ADPCM using FFMPEG, then into PCM again.

Running `node test [adpcm file] [pcm file]` will read two wav files, and test my decoder.

```
$ node test/index.js test/adpcm_mono_44100hz_01.wav test/pcm_mono_44100hz_01.wav
test/adpcm_mono_44100hz_01.wav is MS-ADPCM file
test/pcm_mono_44100hz_01.wav is PCM file
Decoder is correct, maybe

$ node test/index.js test/adpcm_mono_44100hz_02.wav test/pcm_mono_44100hz_02.wav
test/adpcm_mono_44100hz_02.wav is MS-ADPCM file
test/pcm_mono_44100hz_02.wav is PCM file
Decoder is correct, maybe

$ node test/index.js test/adpcm_stereo_44100hz_01.wav test/pcm_stereo_44100hz_01.wav
test/adpcm_stereo_44100hz_01.wav is MS-ADPCM file
test/pcm_stereo_44100hz_01.wav is PCM file
Decoder is correct, maybe

$ node test/index.js test/adpcm_stereo_48000hz_01.wav test/pcm_stereo_48000hz_01.wav
test/adpcm_stereo_48000hz_01.wav is MS-ADPCM file
test/pcm_stereo_48000hz_01.wav is PCM file
Decoder is correct, maybe
```

My decoder is correct, apparently.

## License

Public domain. Just use it, if it broke, don't blame me.
