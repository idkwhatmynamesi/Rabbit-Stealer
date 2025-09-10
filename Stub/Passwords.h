#pragma once
#ifndef PASSWORDS_HPP
#define PASSWORDS_HPP

#include <string>
#include <vector>

struct Password {
    std::string site;
    std::string username;
    std::string password;
    std::string browsername;
};

namespace Browser {
    std::vector<Password> GetPasswords();
}

#endif // PASSWORDS_HPP
