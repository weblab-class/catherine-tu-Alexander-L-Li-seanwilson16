// Paths for file storage
const isProduction = process.env.NODE_ENV === "production";
const BASE_PATH = isProduction ? "/data" : ".";

module.exports = {
  UPLOADS_DIR: `${BASE_PATH}/uploads`,
  STEMS_DIR: `${BASE_PATH}/stems`,
};
