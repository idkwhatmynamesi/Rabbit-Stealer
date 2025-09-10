#pragma once
#ifndef CRYPTO_HPP
#define CRYPTO_HPP

#include <string>
#include <vector>

namespace Crypto {
    std::string CryptoUnprotectData(const std::vector<unsigned char>& data);
    std::string GetMasterKey(const std::string& path);
    std::string AES256GCMDecrypt(const std::string& key, const std::vector<unsigned char>& ciphertext);
}

#endif // CRYPTO_HPP