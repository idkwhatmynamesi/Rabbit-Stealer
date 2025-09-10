#include "asn1.h"
#include <vector>
#include <stdexcept>

static std::vector<unsigned char> sequenceSignature = { 0x04, 0x10, 0xf8 };

Asn1Value DecodeDER(const std::string& der) {
    Asn1Value result;

    if (std::equal(der.begin() + 2, der.begin() + 5, sequenceSignature.begin()))
        throw std::invalid_argument("Not a sequence");

    const size_t startIv = der.find('\b', 33);
    const size_t endIv = der.find('\x04', startIv);
    result.iv = std::string(der.begin() + startIv + 1, der.begin() + endIv);

    const size_t startValue = endIv + 1;
    result.data = std::string(der.begin() + startValue + 1, der.end());

    return result;
}
