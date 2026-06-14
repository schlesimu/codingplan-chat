/* v0.9.10.0 阶段 1+3+4 — 输入框 + 麦克风合二为一（C 方案）
 *
 * 文档：~/.hermes/skills/software-development/codingplan-chat-project/references/input-mic-merged-pattern.md
 *
 * 三态：
 *   静默态：textarea + 内左侧 🎙 + 占位文「写下来 · 或按住说」
 *   输入态（is-typing）：短按聚焦 / 有内容 → 🎙 淡出
 *   录音态（is-recording on .input-area）：长按 ≥400ms → 浮层显出 + 计时 + 实时波形
 *   取消态（is-canceling）：录音中上滑 ≥80px → 提示文变红，松开丢弃录音
 *
 * 与 24-voice.js 的协议：
 *   - startVoiceRecord('input') / stopVoiceRecord('input') / cancelVoiceRecord('input')
 *   - 'voicestream:ready' 事件携带 stream → 用 AnalyserNode 接波形
 *   - 'voicestream:gone' 事件 → 关掉 AudioContext + 停 RAF
 */
(function () {
  'use strict';

  // ====== 配置 ======
  const LONG_PRESS_MS = 400;
  const VIBRATE_MS = 50;
  const SILENT_GUARD_MS = 150;
  const BLUR_FALLBACK_MS = 200;
  const CANCEL_THRESHOLD_PX = 80;        // 上滑取消阈值
  const WAVEFORM_FPS = 40;               // fx-simple 时降到 15
  const WAVEFORM_BARS = 6;
  const HINT_DEFAULT = '↑ 上滑取消';
  const HINT_CANCEL = '松开取消';

  function init() {
    const ta = document.getElementById('userInput');
    const row = ta?.closest('.input-row');
    const area = ta?.closest('.input-area');
    const overlay = document.getElementById('recordingOverlay');
    const timerEl = document.getElementById('recTimer');
    const hintEl = document.getElementById('recHint');
    const waveformEl = document.getElementById('recWaveform');
    if (!ta || !row || !area || !overlay) return;

    const wfBars = waveformEl ? Array.from(waveformEl.querySelectorAll('.wf-bar')) : [];

    // ====== 1. is-typing class 同步 ======
    const syncTypingClass = () => {
      const focused = document.activeElement === ta;
      const hasContent = (ta.value || '').length > 0;
      row.classList.toggle('is-typing', focused || hasContent);
    };
    ta.addEventListener('focus', syncTypingClass);
    ta.addEventListener('input', syncTypingClass);
    ta.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement !== ta && !(ta.value || '').length) {
          row.classList.remove('is-typing');
        }
      }, BLUR_FALLBACK_MS);
    });
    syncTypingClass();

    // ====== 2. 录音浮层状态 ======
    let recStartTs = 0;
    let timerRaf = 0;
    let pressY0 = null;
    let isCanceling = false;
    let audioCtx = null;
    let analyser = null;
    let waveformRaf = 0;
    let waveformLastDraw = 0;

    const fmtTime = (ms) => {
      const s = Math.floor(ms / 1000);
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    };

    const enterRecordingUI = () => {
      area.classList.add('is-recording');
      area.classList.remove('is-canceling');
      isCanceling = false;
      hintEl && (hintEl.textContent = HINT_DEFAULT);
      // 启动计时
      recStartTs = Date.now();
      const tick = () => {
        if (!area.classList.contains('is-recording')) return;
        timerEl && (timerEl.textContent = fmtTime(Date.now() - recStartTs));
        timerRaf = requestAnimationFrame(tick);
      };
      tick();
    };

    const exitRecordingUI = () => {
      area.classList.remove('is-recording');
      area.classList.remove('is-canceling');
      isCanceling = false;
      pressY0 = null;
      cancelAnimationFrame(timerRaf);
      timerEl && (timerEl.textContent = '0:00');
      hintEl && (hintEl.textContent = HINT_DEFAULT);
      // 波形归零
      wfBars.forEach(b => { b.style.height = '8px'; });
      stopWaveform();
    };

    // ====== 3. Web Audio 波形可视化 ======
    const startWaveform = (stream) => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
        const src = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;          // 频域 128 bin
        analyser.smoothingTimeConstant = 0.6;
        src.connect(analyser);
        const bins = new Uint8Array(analyser.frequencyBinCount);
        const isFxSimple = document.body.classList.contains('fx-simple');
        const isFxMinimal = document.body.classList.contains('fx-minimal');
        const fps = isFxMinimal ? 0 : (isFxSimple ? 15 : WAVEFORM_FPS);
        if (fps === 0) return;            // 极简模式：不画波形（保留静态高度）
        const interval = 1000 / fps;

        const draw = (now) => {
          if (!analyser) return;
          waveformRaf = requestAnimationFrame(draw);
          if (now - waveformLastDraw < interval) return;
          waveformLastDraw = now;
          analyser.getByteFrequencyData(bins);
          // 把 128 bin 折成 6 根 bar：取低频权重大的几段
          // 频段切片 [2-8, 8-16, 16-28, 28-44, 44-64, 64-90]
          const slices = [[2,8], [8,16], [16,28], [28,44], [44,64], [64,90]];
          for (let i = 0; i < WAVEFORM_BARS; i++) {
            const [a, b] = slices[i];
            let sum = 0;
            for (let j = a; j < b && j < bins.length; j++) sum += bins[j];
            const avg = sum / (b - a);
            // 0~255 → 6~26px（最低 6 让静默时也有视觉占位）
            const h = 6 + (avg / 255) * 20;
            wfBars[i] && (wfBars[i].style.height = h.toFixed(1) + 'px');
          }
        };
        waveformRaf = requestAnimationFrame(draw);
      } catch (e) {
        console.warn('[mic-input] waveform 初始化失败：', e);
      }
    };

    const stopWaveform = () => {
      cancelAnimationFrame(waveformRaf);
      waveformRaf = 0;
      analyser = null;
      if (audioCtx) {
        try { audioCtx.close(); } catch (_) {}
        audioCtx = null;
      }
    };

    // 监听 stream 就绪
    window.addEventListener('voicestream:ready', (ev) => {
      const detail = ev.detail || {};
      if (detail.mode !== 'input') return;
      if (detail.stream) startWaveform(detail.stream);
    });
    window.addEventListener('voicestream:gone', stopWaveform);

    // ====== 4. 长按 → 录音 ======
    let pressStartTs = 0;
    let longPressTimer = null;
    let isRecordingFromLongPress = false;

    const clearLongPressTimer = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    // v0.9.10.1：抑制 / 恢复系统长按选择菜单（iOS / Android Chrome / OPPO）
    // 按下时立即加，避免系统的 ~500ms 长按菜单与我们的 400ms 录音阈值打架
    const armCalloutSuppress = () => {
      ta.classList.add('suppress-callout');
    };
    const disarmCalloutSuppress = () => {
      ta.classList.remove('suppress-callout');
    };

    const onPressDown = (ev) => {
      if (ev.type === 'mousedown' && ev.button !== 0) return;
      pressStartTs = Date.now();
      pressY0 = (ev.clientY != null) ? ev.clientY : (ev.touches?.[0]?.clientY ?? null);
      isRecordingFromLongPress = false;
      clearLongPressTimer();
      armCalloutSuppress();    // 立即抑制系统菜单

      longPressTimer = setTimeout(() => {
        if (Date.now() - pressStartTs < LONG_PRESS_MS) return;
        if (Date.now() - pressStartTs < SILENT_GUARD_MS) return;
        if (typeof window.startVoiceRecord !== 'function') {
          console.warn('[mic-input] startVoiceRecord 未就绪，回退聚焦');
          ta.focus();
          return;
        }
        isRecordingFromLongPress = true;
        try { navigator.vibrate?.(VIBRATE_MS); } catch (_) {}
        try { ta.blur(); } catch (_) {}
        enterRecordingUI();
        window.startVoiceRecord('input');
      }, LONG_PRESS_MS);
    };

    const onPressMove = (ev) => {
      if (!isRecordingFromLongPress || pressY0 == null) return;
      const y = (ev.clientY != null) ? ev.clientY : (ev.touches?.[0]?.clientY ?? null);
      if (y == null) return;
      const deltaY = y - pressY0;     // 上滑 → 负
      const goingCancel = deltaY <= -CANCEL_THRESHOLD_PX;
      if (goingCancel !== isCanceling) {
        isCanceling = goingCancel;
        area.classList.toggle('is-canceling', isCanceling);
        hintEl && (hintEl.textContent = isCanceling ? HINT_CANCEL : HINT_DEFAULT);
        // 进入取消态额外震一下提示用户
        if (isCanceling) { try { navigator.vibrate?.(20); } catch (_) {} }
      }
    };

    const onPressUp = (ev) => {
      clearLongPressTimer();
      disarmCalloutSuppress();    // v0.9.10.1：松手恢复系统菜单
      if (isRecordingFromLongPress) {
        const wasCanceling = isCanceling;
        isRecordingFromLongPress = false;
        exitRecordingUI();
        if (wasCanceling && typeof window.cancelVoiceRecord === 'function') {
          window.cancelVoiceRecord('input');
        } else if (typeof window.stopVoiceRecord === 'function') {
          window.stopVoiceRecord('input');
        }
        if (ev.cancelable) ev.preventDefault();
      }
      pressStartTs = 0;
      pressY0 = null;
    };

    const onPressCancel = () => {
      clearLongPressTimer();
      disarmCalloutSuppress();    // v0.9.10.1：取消也要恢复
      if (isRecordingFromLongPress) {
        isRecordingFromLongPress = false;
        exitRecordingUI();
        // touchcancel：当作取消（系统中断不发送）
        if (typeof window.cancelVoiceRecord === 'function') {
          window.cancelVoiceRecord('input');
        }
      }
      pressStartTs = 0;
      pressY0 = null;
    };

    // PointerEvent 优先
    if (window.PointerEvent) {
      ta.addEventListener('pointerdown', onPressDown);
      ta.addEventListener('pointermove', onPressMove);
      ta.addEventListener('pointerup', onPressUp);
      ta.addEventListener('pointercancel', onPressCancel);
      ta.addEventListener('pointerleave', (ev) => {
        // 只有真正离开窗口时才取消；上滑过程中不应该 leave
        if (isRecordingFromLongPress && (ev.clientX < 0 || ev.clientY < 0)) onPressCancel();
      });
    } else {
      ta.addEventListener('mousedown', onPressDown);
      ta.addEventListener('mousemove', onPressMove);
      ta.addEventListener('mouseup', onPressUp);
      ta.addEventListener('mouseleave', onPressCancel);
      ta.addEventListener('touchstart', onPressDown, { passive: true });
      ta.addEventListener('touchmove', onPressMove, { passive: true });
      ta.addEventListener('touchend', onPressUp);
      ta.addEventListener('touchcancel', onPressCancel);
    }

    // v0.9.10.1：兜底拦截系统右键 / 长按菜单
    // 长按计时未结束 / 已进入录音 / suppress-callout 还在身上时，拒绝弹菜单
    ta.addEventListener('contextmenu', (ev) => {
      if (longPressTimer || isRecordingFromLongPress || ta.classList.contains('suppress-callout')) {
        ev.preventDefault();
      }
    });
    // selectstart：录音过程中阻止文本选择高亮
    ta.addEventListener('selectstart', (ev) => {
      if (isRecordingFromLongPress) ev.preventDefault();
    });

    // 调试钩子
    window.__micInput = {
      version: 'v0.9.10.1',
      ta, row, area, overlay, wfBars,
      LONG_PRESS_MS, VIBRATE_MS, CANCEL_THRESHOLD_PX,
      enterRecordingUI, exitRecordingUI,    // 测试可调
      get isCanceling() { return isCanceling; },
      get isRecording() { return area.classList.contains('is-recording'); },
    };

    console.log('[mic-input] v0.9.10.0 阶段 1+3+4 已就绪 · 长按',
      LONG_PRESS_MS, 'ms 录音 · 上滑', CANCEL_THRESHOLD_PX, 'px 取消');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
