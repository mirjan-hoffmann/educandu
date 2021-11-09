import i18next from 'i18next';
import icu from 'i18next-icu';
import cloneDeep from '../utils/clone-deep.js';
import { initReactI18next } from 'react-i18next';
import { SUPPORTED_UI_LANGUAGES } from './ui-language.js';

const DEFAULT_NAMESPACE = 'default';

class ResourceManager {
  constructor(...resourceBundles) {
    this._resourceBundles = this._mergeResourceBundles(resourceBundles);
  }

  _mergeResourceBundles(bundles) {
    const result = [];
    for (const bundle of bundles) {
      for (const entry of bundle) {
        const existing = result.find(x => x.namespace === entry.namespace && x.language === entry.language);
        if (existing) {
          existing.resources = { ...existing.resources, ...entry.resources };
        } else {
          result.push(cloneDeep(entry));
        }
      }
    }

    return result;
  }

  getAllResourceBundles() {
    return this._resourceBundles;
  }

  getSupportedLanguages() {
    return SUPPORTED_UI_LANGUAGES;
  }

  createI18n(initialLanguage) {
    const instance = i18next.createInstance();
    instance.use(initReactI18next);
    instance.use(icu);
    instance.init({
      resources: {},
      lng: initialLanguage,
      supportedLngs: SUPPORTED_UI_LANGUAGES,
      defaultNS: DEFAULT_NAMESPACE,
      keySeparator: false,
      interpolation: {
        escapeValue: false
      },
      initImmediate: true
    });
    this._resourceBundles.forEach(bundle => {
      instance.addResourceBundle(bundle.language, bundle.namespace, bundle.resources);
    });
    return instance;
  }
}

export default ResourceManager;
