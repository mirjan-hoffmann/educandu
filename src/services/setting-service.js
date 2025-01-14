import SettingStore from '../stores/setting-store.js';

class SettingService {
  static dependencies = [SettingStore];

  constructor(settingStore) {
    this.settingStore = settingStore;
  }

  async getAllSettings() {
    const settings = await this.settingStore.getAllSettings();
    return settings.reduce((all, { _id, value }) => {
      all[_id] = value;
      return all;
    }, {});
  }

  saveSettings(settings) {
    return this.settingStore.saveSettings(settings);
  }
}

export default SettingService;
