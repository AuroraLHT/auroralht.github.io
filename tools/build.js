/*
 * Builds the photo gallery and index.html for auroralht.github.io.
 *
 *   cd tools && npm install && npm run build
 *
 * Reads full-resolution photos from ../originals/, writes web-sized
 * WebP into ../assets/gallery/, and regenerates ../index.html.
 *
 * index.html is GENERATED — edit the CAP (captions) and CHAPTERS tables
 * below rather than the HTML, or the next build will overwrite your changes.
 * Adding a photo means dropping the .jpg into ../originals/, adding a
 * CAP entry for it, and listing it in a chapter.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'originals');
const OUT = path.join(ROOT, 'assets/gallery');

const slug = f => f.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

// Screenshots and plots are not photographs — they sit on a light card so the
// white background reads as deliberate rather than as a blown-out exposure.
const FIGURE_STYLE = new Set([
  '2DXrayImages_PowderDiffraction_highspeed_xray.png',
  'RHEED_Instance_Segmentation_and_Classification.png',
  'PLD software diagram_white_background.png',
  'Xray_Diffraction_Peak_Detection_and_Numerical_Fitting.png',
  'autonomous_constructured_phase_diagram_using_GPBO_with_calphad_prior.png',
]);

// ── Captions ──────────────────────────────────────────────────
// title | one-line note

const CAP = {
  'PLD_deposition.jpg': ['Ablation plume', 'A pulsed laser hits the target and a few atomic layers cross the chamber.'],
  'PLD_machine.jpg': ['The self-driving thin-film lab', 'PLD chamber, RHEED optics, and the control stack that runs them without me in the room.'],
  'PLDMachine2.jpg': ['PLD system, other side', 'Vacuum, gas handling, and laser optics all have to agree before anything grows.'],
  'My_homemake_frontend_for_PLDandRHEED.jpg': ['Home-made PLD + RHEED front end', 'Live diffraction video, model inference, and intensity tracking in one browser tab.'],
  'RHEEDofHighQualityEtchandAnnealedSubstrate.jpg': ['RHEED, streak by streak', 'A well-etched, well-annealed substrate read live by the segmentation model.'],
  'PLDHeaterBlockThermalGradientDiagnostic.jpg': ['Heater block diagnostic', 'Chasing a few degrees of non-uniformity across the sample stage.'],
  'PLD_target.jpg': ['A PLD target', 'Every film starts as a pressed and sintered puck like this one.'],
  'SelectiveDeposotion_PLD_highthroughput_deposition_design.jpg': ['Selective deposition design', 'Masked geometry that puts several growth conditions on a single substrate.'],
  'trouble_shooting_electron_source.jpg': ['Troubleshooting the electron source', 'The hairpin tungsten filament that supplies electrons to the RHEED gun by thermionic emission. Arcing across its metal contacts had burned it out early.'],
  'wehnelt_cap_assembly_for_RHEED.jpg': ['Wehnelt cap assembly', 'The small part that decides whether you get a usable electron beam.'],
  'aligningPyroMeter.jpg': ['Aligning the pyrometer', 'Through the viewport, onto a substrate already glowing.'],
  'HighTemperatureFurnanceForSubstrateAnnealing.jpg': ['Substrate annealing', 'A high-temperature soak to pull an etched surface back into atomic terraces.'],
  'Sputtering.jpg': ['Sputtering plasma', 'Argon glow discharge, mid-deposition.'],

  'MyFirst_pole_figure.jpg': ['My first pole figure', 'Texture in a thin film, resolved for the first time.'],
  'FullCircle_Rigaku_Xray_machine.jpg': ['Full-circle diffractometer', 'Four-circle goniometry for texture and pole-figure work.'],
  'CompositionLibrary.jpg': ['Composition-spread library', 'One wafer, hundreds of compositions, measured point by point.'],
  'TruncatedCompositionalLibrary.jpg': ['Library on the goniometer', 'Aligned and ready for a long automated scan.'],
  'AFMforDefectIdentification.jpg': ['AFM defect mapping', 'Surface topography of an epitaxial film, hunting for what went wrong.'],
  'WDS.jpg': ['WDS microprobe', 'Wavelength-dispersive spectroscopy when EDS is not quantitative enough.'],
  'DepositionRateEstimationWithProfilometer.jpg': ['Calibrating deposition rate', 'Stylus profilometry across a masked step turns laser pulses into ångströms.'],
  '2DXrayImages_PowderDiffraction_highspeed_xray.png': ['High-speed powder diffraction', 'Six detector frames stitched into one strip; the boxed region is what gets integrated into a pattern.'],

  'FlashAnnealingSystemAtBeamLine17-2_SLAC.jpg': ['Flash-annealing rig at beamline 17-2', 'Built for real-time diffraction during rapid thermal processing at SSRL.'],
  'FlashAnnealingSystem_closeup_SLAC.jpg': ['The rig, close up', 'Lamp heating, gas handling, and the X-ray path inside a 30 cm envelope.'],
  '2D_GIXRD_at_SLAC.jpg': ['2D GIXRD, live', 'Diffraction arcs arriving on the detector while the sample is still heating.'],
  'In-situ_Xray_phase_mapping_on_a_SnBi_composition_gradient_library.jpg': ['In-situ phase mapping, Sn–Bi', 'Composition and temperature swept together, diffraction running throughout.'],
  'Xray-beam-damaged-sample_SLAC.jpg': ['Beam damage', 'What a synchrotron leaves behind when the exposure runs too long.'],
  'groupmate_at_SLAC.jpg': ['Beamtime', 'The hutch at SSRL — beamtime is measured in shifts, not hours.'],

  'As_built_LPDED_Ni_based_alloy_sample_cracked.jpg': ['As-built LPDED wall — cracked', 'Laser powder direct energy deposition of a Ni superalloy; the process window shows itself in the cracks.'],
  'As_built_LPDED_Ni_based_alloy_sample_wavy_top.jpg': ['As-built wall — wavy top', 'Layer-height drift accumulating over a build, and an objective worth optimizing against.'],
  'SEM_crosssection_etched_Ni-based_alloy_with_crack_caused_by_thermal_stress.tif': ['The crack, up close', 'SEM cross-section of the etched alloy. Thermal stress opened this one straight through the columnar grains.'],
  'In-situ_Xray_imaging_system_in_LPDED_machine.jpg': ['In-situ X-ray imaging, installed', 'Watching the melt pool while the laser is still running.'],
  'In-situ_Xray_imaging_system_on_a_linear_stage.jpg': ['The same system, on the bench', 'Source, detector, and motion control breadboarded before anything went into the machine.'],
  'Physical_hacking_the_control_panel_of_a_LPDED_machine.jpg': ['Getting control of a commercial machine', 'A TruLaser Cell 3000 that never shipped with an API, wired for programmatic control.'],
  'LaserSpotCalibrationSample.jpg': ['Laser spot calibration coupon', 'Burn patterns that tell you where the beam actually is.'],
  'Polished_Ni_based_alloy.jpg': ['Polished Ni superalloy', 'Mounted and mirror-finished for microstructure work.'],
  'Polished_Ni_based_alloy_2.jpg': ['Two coupons on the stage', 'Same alloy, different build parameters.'],
  'Samples_of_Ni_based_alloy.jpg': ['The sample archive', 'Every build gets bagged, labelled, and kept.'],
  'LaserCuttedWidgets.jpg': ['Laser-cut parts', 'Custom fixtures, cut in-house, for a one-off experiment.'],
  'Left_over_of_laser_cutted_Ni_plate.jpg': ['What is left of the plate', 'The negative space of a batch of samples.'],

  'DicingSaw.jpg': ['Dicing saw', 'Cleanroom wafer dicing, one street at a time.'],
  'Wafer_dicing.jpg': ['Dicing in progress', 'Blade, coolant, and a very slow feed rate.'],
  'DicedSample.jpg': ['A diced library', 'A gradient wafer cut into individually addressable chips.'],
  'SpinCoater.jpg': ['Spin coater', 'Resist going down at three thousand revolutions per minute.'],
  'PhotoResistAtFab.jpg': ['The resist bench', 'Photolithography chemistry, waiting its turn.'],
  'GoldPad_ThermalEvapolation.jpg': ['Evaporated gold contacts', 'Shadow-masked pads for transport measurements.'],
  'IonMillingMachine.jpg': ['Ion mill', 'Loading a sample for surface cleaning before deposition.'],
  'IonMilledSample.jpg': ['Milled samples on the platter', 'Out of the mill, clean and ready.'],

  'Legolas_an_eduation_platform_for_teaching_closed-loop_experimentation.jpg': ['Legolas', 'A low-cost closed-loop experimentation platform built to teach autonomous science.'],

  'RHEED_Instance_Segmentation_and_Classification.png': ['RHEED, segmented and classified', 'Instance segmentation separates the direct beam, the streaks and the spots, each with its own confidence; a second head calls the growth mode.'],
  'PLD software diagram_white_background.png': ['The control stack', 'Instrument control, the RHEED camera and the ML node all speak through one message queue, with a React front end and an API on top of it.'],
  'Xray_Diffraction_Peak_Detection_and_Numerical_Fitting.png': ['Peak detection and fitting', 'Smooth, detect, then fit — separating overlapping peaks from the background is what turns a raw pattern into numbers a model can use.'],
  'autonomous_constructured_phase_diagram_using_GPBO_with_calphad_prior.png': ['A phase diagram, built autonomously', 'Bayesian optimization with a CALPHAD prior chose every measurement. The thin-film Bi–Sn eutectic lands near 133 °C, below the bulk 141 °C.'],
};

const CHAPTERS = [
  {
    n: '01', id: 'thin-film', title: 'The self-driving thin-film lab',
    lead: 'Pulsed-laser deposition with a computer-vision loop closed around it. The instrument decides what to grow next while the growth is still happening.',
    feature: 'PLD_machine.jpg',
    grid: ['PLD_deposition.jpg', 'RHEEDofHighQualityEtchandAnnealedSubstrate.jpg', 'My_homemake_frontend_for_PLDandRHEED.jpg', 'PLDMachine2.jpg', 'PLDHeaterBlockThermalGradientDiagnostic.jpg', 'aligningPyroMeter.jpg', 'trouble_shooting_electron_source.jpg', 'wehnelt_cap_assembly_for_RHEED.jpg', 'PLD_target.jpg', 'SelectiveDeposotion_PLD_highthroughput_deposition_design.jpg', 'HighTemperatureFurnanceForSubstrateAnnealing.jpg', 'Sputtering.jpg'],
  },
  {
    // No feature photo — the models are the subject, so the animation carries
    // the chapter at full width instead.
    n: '02', id: 'machine-learning', title: 'Machine learning',
    lead: 'The models behind the loop: instance segmentation that reads diffraction patterns as they arrive, peak fitting that turns them into numbers, and Gaussian-process Bayesian optimization deciding what to measure next.',
    // Diagrams and plots must not be cropped, so they run full width rather
    // than as a cover-fitted feature image.
    opener: 'PLD software diagram_white_background.png',
    // These two share an aspect ratio, so a two-up sits level. Everything
    // denser than that gets its own full-width slot.
    grid: [
      'RHEED_Instance_Segmentation_and_Classification.png',
      'Xray_Diffraction_Peak_Detection_and_Numerical_Fitting.png',
    ],
    closer: [
      {
        src: 'assets/media/gpbo-animation.mp4',
        poster: 'assets/media/gpbo-animation-poster.jpg',
        title: 'The optimizer, thinking',
        note: 'Gaussian-process posterior and UCB acquisition over fifteen iterations — the loop that picks which experiment to run next.',
        ar: '1.3827',
        autoplay: true,
        figure: true,
      },
      'autonomous_constructured_phase_diagram_using_GPBO_with_calphad_prior.png',
    ],
  },
  {
    n: '03', id: 'structure', title: 'Reading structure',
    lead: 'Diffraction, microscopy, and microprobe work — the measurements that tell you whether the thing you made is the thing you meant to make.',
    feature: 'MyFirst_pole_figure.jpg',
    grid: ['CompositionLibrary.jpg', 'FullCircle_Rigaku_Xray_machine.jpg', 'AFMforDefectIdentification.jpg', 'TruncatedCompositionalLibrary.jpg', 'In-situ_Xray_phase_mapping_on_a_SnBi_composition_gradient_library.jpg', '2DXrayImages_PowderDiffraction_highspeed_xray.png', 'WDS.jpg', 'DepositionRateEstimationWithProfilometer.jpg'],
    video: {
      src: 'assets/media/cathodoluminescence.mp4',
      poster: 'assets/media/cathodoluminescence-poster.jpg',
      title: 'Cathodoluminescence',
      note: 'An Al₂O₃ substrate lighting up under the electron beam.',
    },
  },
  {
    n: '04', id: 'beamtime', title: 'Beamtime',
    lead: 'Hardware I built, shipped to SSRL at SLAC, and ran around the clock. Synchrotron time is allocated in shifts, and nothing gets a second take.',
    feature: 'FlashAnnealingSystemAtBeamLine17-2_SLAC.jpg',
    grid: ['FlashAnnealingSystem_closeup_SLAC.jpg', '2D_GIXRD_at_SLAC.jpg', 'Xray-beam-damaged-sample_SLAC.jpg', 'groupmate_at_SLAC.jpg'],
  },
  {
    n: '05', id: 'additive', title: 'Metal, melted',
    lead: 'Bayesian optimization applied to laser powder direct energy deposition, with in-situ X-ray imaging built to see the melt pool as it forms.',
    feature: 'As_built_LPDED_Ni_based_alloy_sample_cracked.jpg',
    grid: ['As_built_LPDED_Ni_based_alloy_sample_wavy_top.jpg', 'SEM_crosssection_etched_Ni-based_alloy_with_crack_caused_by_thermal_stress.tif', 'In-situ_Xray_imaging_system_in_LPDED_machine.jpg', 'Physical_hacking_the_control_panel_of_a_LPDED_machine.jpg', 'In-situ_Xray_imaging_system_on_a_linear_stage.jpg', 'LaserSpotCalibrationSample.jpg', 'Polished_Ni_based_alloy.jpg', 'Polished_Ni_based_alloy_2.jpg', 'Samples_of_Ni_based_alloy.jpg', 'LaserCuttedWidgets.jpg', 'Left_over_of_laser_cutted_Ni_plate.jpg'],
  },
  {
    n: '06', id: 'fab', title: 'The fab floor',
    lead: 'Dicing, lithography, evaporation, milling. Automation only earns its keep if the sample preparation underneath it is sound.',
    feature: 'DicingSaw.jpg',
    grid: ['DicedSample.jpg', 'Wafer_dicing.jpg', 'SpinCoater.jpg', 'GoldPad_ThermalEvapolation.jpg', 'PhotoResistAtFab.jpg', 'IonMillingMachine.jpg', 'IonMilledSample.jpg'],
  },
  {
    n: '07', id: 'teaching', title: 'Passing it on',
    lead: 'Autonomous experimentation should not require a synchrotron to learn. Legolas is the cheap, teachable version of the same loop.',
    feature: 'Legolas_an_eduation_platform_for_teaching_closed-loop_experimentation.jpg',
    grid: [],
  },
];


// ── Build ─────────────────────────────────────────────────────

async function buildAssets() {
  fs.mkdirSync(OUT, { recursive: true });
  const files = fs.readdirSync(SRC).filter(f => /\.(jpe?g|png|tiff?)$/i.test(f)).sort();
  const manifest = {};
  for (const f of files) {
    const id = slug(f);
    const opts = { failOnError: false };
    const src = path.join(SRC, f);

    // Exported plots carry a wide uniform margin that leaves the tile looking
    // half empty; trim it so the figure fills its card. Photographs never get
    // trimmed — a real photo has no uniform border to remove.
    const isFig = FIGURE_STYLE.has(f);
    const pipeline = () => {
      var p = sharp(src, opts).rotate();
      return isFig ? p.trim(12) : p;
    };

    var w, h;
    if (isFig) {
      const trimmed = await pipeline().toBuffer({ resolveWithObject: true });
      w = trimmed.info.width;
      h = trimmed.info.height;
    } else {
      const meta = await sharp(src, opts).metadata();
      const rot = meta.orientation >= 5;                     // EXIF says the camera was turned
      w = rot ? meta.height : meta.width;
      h = rot ? meta.width : meta.height;
    }

    const grid = path.join(OUT, `${id}-900.webp`);
    const full = path.join(OUT, `${id}-1800.webp`);
    if (!fs.existsSync(grid)) {
      await pipeline().resize({ width: 900, withoutEnlargement: true })
        .webp({ quality: 76 }).toFile(grid);
    }
    if (!fs.existsSync(full)) {
      await pipeline().resize({ width: 1800, withoutEnlargement: true })
        .webp({ quality: 74 }).toFile(full);
    }
    // 20px inline placeholder so a tile never flashes empty while loading
    const lqip = await pipeline().resize({ width: 20 })
      .webp({ quality: 30 }).toBuffer();

    manifest[f] = { id, w, h, lqip: `data:image/webp;base64,${lqip.toString('base64')}` };
  }
  return manifest;
}

// A photo listed in a chapter but missing from originals/ is a typo,
// not something to render as a broken tile.
let manifest = {};
const M = f => {
  if (!manifest[f]) throw new Error('No such photo in originals/: ' + f);
  return manifest[f];
};

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let idx = 0;
const figure = (f, cls) => {
  const m = M(f);
  const [title, note] = CAP[f] || [f, ''];
  const i = idx++;
  const klass = [cls, FIGURE_STYLE.has(f) ? 'shot-figure' : ''].filter(Boolean).join(' ');
  return `        <figure class="shot ${klass}" data-i="${i}" style="--ar:${(m.w / m.h).toFixed(4)}">
          <button class="shot-btn" type="button" aria-label="${esc(title)} — open larger">
            <span class="shot-frame" style="background-image:url(${m.lqip})">
              <img src="assets/gallery/${m.id}-900.webp" width="${m.w}" height="${m.h}"
                   alt="${esc(title)}. ${esc(note)}" loading="lazy" decoding="async"
                   data-full="assets/gallery/${m.id}-1800.webp" />
            </span>
          </button>
          <figcaption><b>${esc(title)}</b><span>${esc(note)}</span></figcaption>
        </figure>`;
};

// autoplay: for short generated animations that read as a moving diagram.
// script.js pauses these when the visitor prefers reduced motion.
const videoFigure = v => `        <figure class="shot shot-video${v.figure ? ' shot-figure' : ''}" style="--ar:${v.ar || '1.7778'}">
          <span class="shot-frame">
            <video src="${v.src}" poster="${v.poster}" ${v.autoplay ? 'autoplay preload="metadata"' : 'preload="none"'} controls playsinline loop muted></video>
          </span>
          <figcaption><b>${esc(v.title)}</b><span>${esc(v.note)}</span></figcaption>
        </figure>`;

// A wide slot holds anything that must stay uncropped and legible — a system
// diagram, a dense plot, an animation. Takes a filename or a video config.
const wideSlot = w => `    <div class="chapter-wide">
${typeof w === 'string' ? figure(w, 'shot-wide') : videoFigure(w)}
    </div>`;

const wideSlots = w => (w ? [].concat(w).map(wideSlot).join('\n') : '');

const chapterHtml = c => `
  <section class="chapter" id="${c.id}">
    <div class="chapter-head">
      <span class="chapter-n">${c.n}</span>
      <h2>${esc(c.title)}</h2>
      <p>${esc(c.lead)}</p>
    </div>
${c.feature ? figure(c.feature, 'shot-feature') : ''}${c.opener ? wideSlots(c.opener) + '\n' : ''}
${c.grid.length || c.video ? `    <div class="grid" data-count="${c.grid.length + (c.video ? 1 : 0)}">
${c.grid.map(f => figure(f, '')).join('\n')}${c.video ? (c.grid.length ? '\n' : '') + videoFigure(c.video) : ''}
    </div>` : ''}${c.closer ? '\n' + wideSlots(c.closer) : ''}
  </section>`;

function render() {
const hero = M('PLD_deposition.jpg');
const chapters = CHAPTERS.map(chapterHtml).join('\n');

return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Haotong Liang — Autonomous Experimentation</title>
  <meta name="description" content="Haotong Liang builds self-driving laboratories for materials discovery: pulsed-laser deposition, real-time computer vision, and Bayesian optimization. A photographic tour of the work." />
  <meta property="og:title" content="Haotong Liang — Autonomous Experimentation" />
  <meta property="og:description" content="A photographic tour of building self-driving laboratories for materials discovery." />
  <meta property="og:type" content="website" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="style.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Source+Serif+4:opsz,wght@8..60,300;8..60,400;8..60,600&display=swap" rel="stylesheet" />
  <link rel="preload" as="image" href="assets/gallery/${hero.id}-1800.webp" />
</head>
<body>

<a class="skip" href="#thin-film">Skip to the work</a>

<header class="topbar">
  <a class="brand" href="#top">Haotong&nbsp;Liang</a>
  <nav class="topnav">
    <a href="#thin-film">Work</a>
    <a href="mailto:hliang16@umd.edu">Email</a>
    <a href="https://github.com/auroralht" target="_blank" rel="noopener">GitHub</a>
    <a class="cta" href="Resume/ResumeHaotongLiang2026.html" target="_blank" rel="noopener">Résumé</a>
  </nav>
</header>

<main id="top">

  <section class="hero">
    <img class="hero-img" src="assets/gallery/${hero.id}-1800.webp" alt="A pulsed-laser ablation plume crossing a deposition chamber" fetchpriority="high" decoding="async" />
    <div class="hero-copy">
      <p class="eyebrow">Ph.D. Candidate · Materials Science &amp; Engineering · University of Maryland</p>
      <h1>I build laboratories<br />that run themselves.</h1>
      <p class="hero-lede">
        Deep learning and Bayesian inference, wired directly into deposition chambers,
        diffractometers, and additive-manufacturing machines — so the experiment can decide
        what to do next while it is still running. Here is what that looks like.
      </p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="Resume/ResumeHaotongLiang2026.html" target="_blank" rel="noopener">Read my résumé</a>
        <a class="btn btn-ghost" href="mailto:hliang16@umd.edu">hliang16@umd.edu</a>
      </div>
    </div>
    <a class="scroll-cue" href="#thin-film" aria-label="Scroll to the work"><span></span></a>
  </section>

  <section class="facts">
    <div class="fact"><b>7</b><span>publications, 4 as first author</span></div>
    <div class="fact"><b>Science Advances</b><span>first author, 2025</span></div>
    <div class="fact"><b>8&nbsp;years</b><span>in the Takeuchi group</span></div>
    <div class="fact"><b>100×</b><span>the throughput goal</span></div>
  </section>
${chapters}

  <section class="resume-band">
    <p class="eyebrow">The written version</p>
    <h2>Everything above, in one page of text.</h2>
    <p>Publications, methods, coursework, and the full research history — formatted to read and to print.</p>
    <a class="btn btn-primary btn-lg" href="Resume/ResumeHaotongLiang2026.html" target="_blank" rel="noopener">Open résumé</a>
  </section>

</main>

<footer class="foot">
  <div>
    <a href="mailto:hliang16@umd.edu">hliang16@umd.edu</a>
    <a href="https://github.com/auroralht" target="_blank" rel="noopener">github.com/auroralht</a>
    <a href="Resume/ResumeHaotongLiang2026.html" target="_blank" rel="noopener">Résumé</a>
  </div>
  <p>© ${new Date().getFullYear()} Haotong Liang · College Park, Maryland</p>
</footer>

<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" hidden>
  <button class="lb-close" type="button" aria-label="Close">&times;</button>
  <button class="lb-nav lb-prev" type="button" aria-label="Previous image">&#8249;</button>
  <button class="lb-nav lb-next" type="button" aria-label="Next image">&#8250;</button>
  <figure class="lb-stage">
    <img id="lb-img" alt="" />
    <figcaption><b id="lb-title"></b><span id="lb-note"></span></figcaption>
  </figure>
</div>

<script src="script.js"></script>
</body>
</html>
`;
}

async function main() {
  manifest = await buildAssets();
  fs.writeFileSync(path.join(ROOT, 'index.html'), render());
  console.log(`index.html written — ${idx} figures, ${Object.keys(manifest).length} photos processed`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
