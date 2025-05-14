#include "passwordhasher.h"
#include <QDebug>
#include <QDataStream> // For integer to byte conversion (manual preferred for endianness)

// Crypto++
#include "pwdbased.h" // For PKCS5_PBKDF2_HMAC
#include "osrng.h"    // For AutoSeededRandomPool
// #include "base64.h" // No longer using CryptoPP's Base64 directly for this part
#include "filters.h"  // For StringSource, StringSink (still used by PBKDF2)
#include "secblock.h" // For SecByteBlock
#include "misc.h"     // For VerifyBufsEqual

// using namespace CryptoPP; // Keep CryptoPP usage explicit for clarity or use in specific blocks

namespace PasswordHashing {

// --- 内部辅助函数 ---

// 将无符号整数转换为指定长度的大端字节QByteArray
static QByteArray UIntToBytesBigEndian(unsigned int value, int num_bytes) {
    if (num_bytes <= 0 || num_bytes > 4) {
        qWarning() << "UIntToBytesBigEndian: Invalid num_bytes" << num_bytes;
        return QByteArray();
    }
    QByteArray result(num_bytes, 0);
    for (int i = 0; i < num_bytes; ++i) {
        result[num_bytes - 1 - i] = static_cast<char>((value >> (i * 8)) & 0xFF);
    }
    return result;
}

// 将大端字节QByteArray转换为无符号整数
static unsigned int BytesToUIntBigEndian(const QByteArray& bytes) {
    if (bytes.isEmpty() || bytes.size() > 4) {
        qWarning() << "BytesToUIntBigEndian: Invalid byte array size" << bytes.size();
        return 0;
    }
    unsigned int result = 0;
    for (int i = 0; i < bytes.size(); ++i) {
        result = (result << 8) | static_cast<unsigned char>(bytes.at(i));
    }
    return result;
}

// 使用 Qt 的 Base64 编码 (URL-safe, 无填充)
static QString BytesToBase64Qt(const QByteArray& bytes) {
    return QString::fromLatin1(bytes.toBase64(QByteArray::Base64UrlEncoding | QByteArray::OmitTrailingEquals));
}

// 使用 Qt 的 Base64 解码 (URL-safe, 无填充)
static QByteArray Base64ToBytesQt(const QString& base64_qstr) {
    return QByteArray::fromBase64(base64_qstr.toLatin1(), QByteArray::Base64UrlEncoding | QByteArray::OmitTrailingEquals);
}


static QByteArray GenerateSaltInternal(size_t length) {
    CryptoPP::AutoSeededRandomPool prng;
    CryptoPP::SecByteBlock salt_block(length);
    prng.GenerateBlock(salt_block, salt_block.size());
    return QByteArray(reinterpret_cast<const char*>(salt_block.data()), salt_block.size());
}

QString HashPasswordFixedLength(const QString& password, unsigned int iterations_param) {
    try {
        QByteArray passwordBytes = password.toUtf8();
        unsigned int iterations_to_use = (iterations_param == 0) ? DEFAULT_ITERATIONS : iterations_param;

        if (iterations_to_use > MAX_ITERATIONS) {
            qWarning() << "Iterations" << iterations_to_use << "exceeds " << ITERATIONS_BINARY_LENGTH << "-byte limit (" << MAX_ITERATIONS <<"), capping.";
            iterations_to_use = MAX_ITERATIONS;
        }
        if (iterations_to_use == 0) { // PBKDF2 requires iterations > 0
            qWarning() << "Iterations cannot be zero, setting to 1.";
            iterations_to_use = 1;
        }


        QByteArray iterBytes = UIntToBytesBigEndian(iterations_to_use, ITERATIONS_BINARY_LENGTH);
        QString iterBase64 = BytesToBase64Qt(iterBytes);
        if (iterBase64.length() != ITERATIONS_BASE64_LENGTH) {
            qCritical() << "FATAL: Iteration Base64 length mismatch. Expected:" << ITERATIONS_BASE64_LENGTH << "Got:" << iterBase64.length();
            return QString(); // Critical error, indicates problem with Base64 logic or constants
        }

        QByteArray salt = GenerateSaltInternal(SALT_BINARY_LENGTH);
        QString saltBase64 = BytesToBase64Qt(salt);
        if (saltBase64.length() != SALT_BASE64_LENGTH) {
            qCritical() << "FATAL: Salt Base64 length mismatch. Expected:" << SALT_BASE64_LENGTH << "Got:" << saltBase64.length();
            return QString();
        }

        CryptoPP::SecByteBlock derivedKey(HASH_BINARY_LENGTH);
        CryptoPP::PKCS5_PBKDF2_HMAC<CryptoPP::SHA256> pbkdf2;
        pbkdf2.DeriveKey(
            derivedKey.data(), derivedKey.size(), 0,
            (const CryptoPP::byte*)passwordBytes.constData(), passwordBytes.size(),
            (const CryptoPP::byte*)salt.constData(), salt.size(),
            iterations_to_use
            );
        QByteArray derivedKeyBytes(reinterpret_cast<const char*>(derivedKey.data()), derivedKey.size());
        QString hashBase64 = BytesToBase64Qt(derivedKeyBytes);
        if (hashBase64.length() != HASH_BASE64_LENGTH) {
            qCritical() << "FATAL: Hash Base64 length mismatch. Expected:" << HASH_BASE64_LENGTH << "Got:" << hashBase64.length();
            return QString();
        }

        QString result = VERSION_TAG_V1 + ALGORITHM_TAG_PBKDF2_SHA256 + iterBase64 + saltBase64 + hashBase64;

        if (result.length() != FIXED_TOTAL_HASH_STRING_LENGTH) {
            // This should ideally not happen if all component lengths are correct.
            qCritical() << "FATAL: Final hash string length (" << result.length()
                        << ") does not match fixed expected length (" << FIXED_TOTAL_HASH_STRING_LENGTH << "). Review component Base64 lengths.";
            return QString();
        }
        return result;

    } catch (const CryptoPP::Exception& e) {
        qWarning() << "密码哈希过程中出错 (FixedLength):" << e.what();
        return QString();
    }
}

bool VerifyPasswordFixedLength(const QString& password_to_check, const QString& stored_fixed_length_hash_string) {
    if (stored_fixed_length_hash_string.length() != FIXED_TOTAL_HASH_STRING_LENGTH) {
        qWarning() << "验证失败：存储的哈希字符串长度 (" << stored_fixed_length_hash_string.length()
            << ") 与固定的预期长度 (" << FIXED_TOTAL_HASH_STRING_LENGTH << ") 不符。";
        return false;
    }

    try {
        int current_pos = 0;
        QString version = stored_fixed_length_hash_string.mid(current_pos, VERSION_TAG_V1.length());
        current_pos += VERSION_TAG_V1.length();

        QString algorithm = stored_fixed_length_hash_string.mid(current_pos, ALGORITHM_TAG_PBKDF2_SHA256.length());
        current_pos += ALGORITHM_TAG_PBKDF2_SHA256.length();

        if (version != VERSION_TAG_V1 || algorithm != ALGORITHM_TAG_PBKDF2_SHA256) {
            qWarning() << "验证失败：版本或算法不匹配。Expected V:" << VERSION_TAG_V1 << "Alg:" << ALGORITHM_TAG_PBKDF2_SHA256
                       << "Got V:" << version << "Alg:" << algorithm;
            return false;
        }

        QString iterBase64 = stored_fixed_length_hash_string.mid(current_pos, ITERATIONS_BASE64_LENGTH);
        current_pos += ITERATIONS_BASE64_LENGTH;

        QString saltBase64 = stored_fixed_length_hash_string.mid(current_pos, SALT_BASE64_LENGTH);
        current_pos += SALT_BASE64_LENGTH;

        QString expectedHashBase64 = stored_fixed_length_hash_string.mid(current_pos, HASH_BASE64_LENGTH);
        // current_pos += HASH_BASE64_LENGTH; // No more parts after this

        QByteArray iterBytes = Base64ToBytesQt(iterBase64);
        if (iterBytes.isEmpty() && !iterBase64.isEmpty()){ qWarning() << "Iteration Base64 decoding failed for:" << iterBase64; return false;}
        if (iterBytes.size() != ITERATIONS_BINARY_LENGTH && !iterBase64.isEmpty()){ qWarning() << "Decoded iteration byte length mismatch. Expected:" << ITERATIONS_BINARY_LENGTH << "Got:" << iterBytes.size(); return false;}
        unsigned int stored_iterations = BytesToUIntBigEndian(iterBytes);
        if (stored_iterations == 0 && !iterBase64.isEmpty()){ qWarning() << "Decoded iterations is zero, which is invalid for PBKDF2."; return false;}


        QByteArray salt = Base64ToBytesQt(saltBase64);
        if (salt.isEmpty() && !saltBase64.isEmpty()){ qWarning() << "Salt Base64 decoding failed for:" << saltBase64; return false;}
        if (salt.size() != SALT_BINARY_LENGTH && !saltBase64.isEmpty()) {
            qWarning() << "Decoded salt length mismatch. Expected:" << SALT_BINARY_LENGTH << "Got:" << salt.size();
            return false;
        }

        QByteArray expectedDerivedKey = Base64ToBytesQt(expectedHashBase64);
        if (expectedDerivedKey.isEmpty() && !expectedHashBase64.isEmpty()){ qWarning() << "Expected hash Base64 decoding failed for:" << expectedHashBase64; return false;}
        if (expectedDerivedKey.size() != HASH_BINARY_LENGTH && !expectedHashBase64.isEmpty()) {
            qWarning() << "Decoded expected hash length mismatch. Expected:" << HASH_BINARY_LENGTH << "Got:" << expectedDerivedKey.size();
            return false;
        }

        QByteArray passwordBytes = password_to_check.toUtf8();

        CryptoPP::SecByteBlock derivedKeyFromVerification(HASH_BINARY_LENGTH);
        CryptoPP::PKCS5_PBKDF2_HMAC<CryptoPP::SHA256> pbkdf2;
        pbkdf2.DeriveKey(
            derivedKeyFromVerification.data(), derivedKeyFromVerification.size(), 0,
            (const CryptoPP::byte*)passwordBytes.constData(), passwordBytes.size(),
            (const CryptoPP::byte*)salt.constData(), salt.size(),
            stored_iterations
            );
        QByteArray actualDerivedKeyBytes(reinterpret_cast<const char*>(derivedKeyFromVerification.data()), derivedKeyFromVerification.size());

        if (actualDerivedKeyBytes.size() != expectedDerivedKey.size()) {
            // This should not happen if HASH_BINARY_LENGTH is consistent
            qWarning() << "Internal error: actual derived key size does not match expected.";
            return false;
        }
        return CryptoPP::VerifyBufsEqual(
            reinterpret_cast<const CryptoPP::byte*>(actualDerivedKeyBytes.constData()),
            reinterpret_cast<const CryptoPP::byte*>(expectedDerivedKey.constData()),
            expectedDerivedKey.size()
            );

    } catch (const CryptoPP::Exception& e) {
        qWarning() << "密码验证过程中CryptoPP异常 (FixedLength):" << e.what();
        return false;
    } catch (const std::exception& e_std) { // Catch other potential C++ exceptions
        qWarning() << "密码验证过程中std异常 (FixedLength):" << e_std.what();
        return false;
    }
}

} // namespace PasswordHashing
