#ifndef PASSWORDHASHER_H
#define PASSWORDHASHER_H

#include <QString>
#include <QByteArray>

// Crypto++
#include "cryptlib.h"
#include "sha.h"      // For SHA256::DIGESTSIZE

namespace PasswordHashing {

// --- 固定配置 ---
const QString VERSION_TAG_V1 = "V1";
const QString ALGORITHM_TAG_PBKDF2_SHA256 = "S2";

// 迭代次数: 3字节二进制 -> 4 Base64字符
const unsigned int ITERATIONS_BINARY_LENGTH = 3;
const unsigned int ITERATIONS_BASE64_LENGTH = 4; // ceil(3 * 4 / 3.0)

// 盐: 16字节二进制 -> 22 Base64字符
const unsigned int SALT_BINARY_LENGTH = 16;
const unsigned int SALT_BASE64_LENGTH = 22; // ceil(16 * 4 / 3.0)

// 哈希: SHA256 (32字节二进制) -> 43 Base64字符
const unsigned int HASH_BINARY_LENGTH = CryptoPP::SHA256::DIGESTSIZE;
const unsigned int HASH_BASE64_LENGTH = 43; // ceil(32 * 4 / 3.0)

// 固定的总长度: 2(V) + 2(Alg) + 4(Iter) + 22(Salt) + 43(Hash) = 73 chars
const unsigned int FIXED_TOTAL_HASH_STRING_LENGTH =
    VERSION_TAG_V1.length() +
    ALGORITHM_TAG_PBKDF2_SHA256.length() +
    ITERATIONS_BASE64_LENGTH +
    SALT_BASE64_LENGTH +
    HASH_BASE64_LENGTH;

// OWASP 推荐 PBKDF2-HMAC-SHA256 迭代次数至少 310,000 (截至2023/2024，请查阅最新指南)
const unsigned int DEFAULT_ITERATIONS = 310000;
const unsigned int MAX_ITERATIONS = 0xFFFFFF; // 3 bytes max

/**
 * @brief 使用 PBKDF2-HMAC-SHA256 哈希密码，并使用 Base64 编码结果。
 *        生成的字符串具有固定的总长度 (EXPECTED_TOTAL_HASH_STRING_LENGTH)。
 * @param password 纯文本密码。
 * @param iterations 使用的迭代次数 (如果为0, 则使用 DEFAULT_ITERATIONS)。
 * @return 固定长度的组合哈希字符串，如果出错则返回空 QString。
 */
QString HashPasswordFixedLength(const QString& password, unsigned int iterations = 0);

/**
 * @brief 根据存储的固定长度组合哈希字符串验证密码。
 * @param password_to_check 要验证的纯文本密码。
 * @param stored_fixed_length_hash_string 存储的固定长度组合哈希字符串。
 * @return 如果密码匹配则为 true，否则为 false。
 */
bool VerifyPasswordFixedLength(const QString& password_to_check, const QString& stored_fixed_length_hash_string);

} // namespace PasswordHashing

#endif // PASSWORDHASHER_H
