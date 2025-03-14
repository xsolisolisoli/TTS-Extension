import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { KokoroTTS, TextSplitterStream } from 'kokoro-js';
import { t } from '@extension/i18n';
import { ToggleButton } from '@extension/ui';

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = async () => {
  const model_id = 'onnx-community/Kokoro-82M-v1.0-ONNX';
  const tts = await KokoroTTS.from_pretrained(model_id, {
    dtype: 'q8', // Options: "fp32", "fp16", "q8", "q4", "q4f16"
    device: 'wasm', // Options: "wasm", "webgpu" (web) or "cpu" (node). If using "webgpu", we recommend using dtype="fp32".
  });
  const text = "Life is like a box of chocolates. You never know what you're gonna get.";
  // First, set up the stream
  const splitter = new TextSplitterStream();
  const stream = tts.stream(splitter);
  (async () => {
    let i = 0;
    for await (const { text, phonemes, audio } of stream) {
      console.log({ text, phonemes });
      audio.save(`audio-${i++}.wav`);
    }
  })();
  const tokens = text.match(/\s*\S+/g);
  if (tokens) {
    for (const token of tokens) {
      splitter.push(token);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  // Finally, close the stream to signal that no more text will be added.
  splitter.flush();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';
  const goGithubSite = () =>
    chrome.tabs.create({ url: 'https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite' });

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
      chrome.notifications.create('inject-error', notificationOptions);
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        files: ['/content-runtime/index.iife.js'],
      })
      .catch(err => {
        // Handling errors related to other paths
        if (err.message.includes('Cannot access a chrome:// URL')) {
          chrome.notifications.create('inject-error', notificationOptions);
        }
      });
  };

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        {/* <button onClick={goGithubSite}> */}
        <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        {/* </button> */}
        <p>
          Edit <code>pages/popup/src/Popup.tsx</code>
        </p>
        {/* <button
          className={
            'font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ' +
            (isLight ? 'bg-blue-200 text-black' : 'bg-gray-700 text-white')
          }
          onClick={injectContentScript}>
          Click to inject Content Script
        </button> */}
        <ToggleButton>{t('toggleTheme')}</ToggleButton>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
